import { getSupabaseClient, isSupabaseConfigured } from "@/src/lib/supabaseClient"

// Types
export type Role = "participant" | "support" | "admin"
export type Group = "control" | "intervention"

export interface User {
  id?: string
  alias: string
  role: Role
  group?: Group
  studyCode?: string
  supportCode?: string
  // 👇 ADD THESE
  linkedParticipant?: string
  participantGroup?: string
  createdAt: string
}

export interface StepEntry {
  date: string
  steps: number
}

export interface Message {
  id: string
  from: string
  to: string
  text: string
  timestamp: string
}

export interface Badge {
  id: string
  name: string
  description: string
  icon: string
  unlockedAt?: string
}

export const BADGES: Badge[] = [
  { id: "first-steps", name: "First Steps", description: "Log your first day of steps", icon: "Footprints" },
  { id: "week-warrior", name: "Week Warrior", description: "Log steps every day for a week", icon: "Calendar" },
  { id: "goal-crusher", name: "Goal Crusher", description: "Reach 35,000 weekly steps", icon: "Target" },
  { id: "streak-starter", name: "Streak Starter", description: "Reach a 3-day streak", icon: "Flame" },
  { id: "streak-master", name: "Streak Master", description: "Reach a 7-day streak", icon: "Zap" },
  { id: "point-collector", name: "Point Collector", description: "Earn 500 points", icon: "Star" },
  { id: "champion", name: "Champion", description: "Reach Champion level (1500+ points)", icon: "Trophy" },
  { id: "ten-k-day", name: "10K Day", description: "Log 10,000+ steps in a single day", icon: "TrendingUp" },
]

// Local storage keys
const USERS_KEY = "gssi_users"
const CURRENT_USER_KEY = "gssi_current_user"
const STEPS_KEY = "gssi_steps"
const MESSAGES_KEY = "gssi_messages"
const BADGES_KEY = "gssi_badges"

function saveSteps(alias: string, entries: StepEntry[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(`${STEPS_KEY}_${alias}`, JSON.stringify(entries))
}

function normalizeDate(value: string) {
  return new Date(value).toISOString().split("T")[0]
}

function mergeStepEntries(entries: StepEntry[]) {
  const byDate = new Map<string, number>()
  for (const entry of entries) {
    byDate.set(entry.date, (byDate.get(entry.date) || 0) + entry.steps)
  }
  return [...byDate.entries()]
    .map(([date, steps]) => ({ date, steps }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

function normalizeParticipant(row: any): User {
  return {
    id: row.id ? String(row.id) : undefined,
    alias: row.alias,
    role: "participant",
    group: row.group_type || row.group,
    studyCode: row.study_code,
    supportCode: row.support_code,
    createdAt: row.created_at || new Date().toISOString(),
  }
}

async function getParticipantId(alias: string) {
  const localUser = getUsers().find((u) => u.alias === alias)
  if (localUser?.id) return localUser.id
  if (!isSupabaseConfigured()) return null

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("participants")
    .select("id, alias, group_type, study_code, support_code, created_at")
    .eq("alias", alias)
    .maybeSingle()

  if (error || !data?.id) return null

  saveUser(normalizeParticipant(data))
  return String(data.id)
}

function shouldUseLocalFallback(error: any) {
  if (!error) return false
  const code = error.code || ""
  return code === "42P01" || code === "42703" || error.message?.includes("not configured")
}

// User management
export function getUsers(): User[] {
  if (typeof window === "undefined") return []
  const data = localStorage.getItem(USERS_KEY)
  return data ? JSON.parse(data) : []
}

export function saveUser(user: User) {
  const users = getUsers()
  const existing = users.findIndex((u) => u.alias === user.alias)
  if (existing >= 0) {
    users[existing] = user
  } else {
    users.push(user)
  }
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

export async function getUsersAsync(): Promise<User[]> {
  const localUsers = getUsers()
  if (!isSupabaseConfigured()) return localUsers

  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from("participants")
      .select("id, alias, group_type, study_code, support_code, created_at")
      .order("created_at", { ascending: true })

    if (error || !data) return localUsers

    const remoteParticipants = data.map(normalizeParticipant)
    for (const participant of remoteParticipants) {
      saveUser(participant)
    }

    const localNonParticipants = localUsers.filter((user) => user.role !== "participant")
    return [...localNonParticipants, ...remoteParticipants]
  } catch {
    return localUsers
  }
}

export function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null
  const data = localStorage.getItem(CURRENT_USER_KEY)
  return data ? JSON.parse(data) : null
}

export function setCurrentUser(user: User | null) {
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user))
  } else {
    localStorage.removeItem(CURRENT_USER_KEY)
  }
}

// Steps management
export function getSteps(alias: string): StepEntry[] {
  if (typeof window === "undefined") return []
  const data = localStorage.getItem(`${STEPS_KEY}_${alias}`)
  return data ? JSON.parse(data) : []
}

export function addSteps(alias: string, steps: number) {
  const entries = getSteps(alias)
  const today = new Date().toISOString().split("T")[0]
  const existing = entries.findIndex((e) => e.date === today)
  if (existing >= 0) {
    entries[existing].steps += steps
  } else {
    entries.push({ date: today, steps })
  }
  localStorage.setItem(`${STEPS_KEY}_${alias}`, JSON.stringify(entries))
}

export function getWeeklySteps(alias: string): StepEntry[] {
  const entries = getSteps(alias)
  const now = new Date()
  const weekAgo = new Date(now)
  weekAgo.setDate(weekAgo.getDate() - 6)
  const weekAgoStr = weekAgo.toISOString().split("T")[0]

  // Generate all 7 days
  const days: StepEntry[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split("T")[0]
    const found = entries.find((e) => e.date === dateStr)
    days.push({ date: dateStr, steps: found ? found.steps : 0 })
  }
  return days
}

export function getWeeklyTotal(alias: string): number {
  return getWeeklySteps(alias).reduce((sum, e) => sum + e.steps, 0)
}

export async function getStepsAsync(alias: string): Promise<StepEntry[]> {
  const localSteps = getSteps(alias)
  if (!isSupabaseConfigured()) return localSteps

  try {
    const participantId = await getParticipantId(alias)
    if (!participantId) return localSteps

    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from("activity_logs")
      .select("steps, date")
      .eq("participant_id", participantId)
      .order("date", { ascending: true })

    if (error || !data) return localSteps

    const remoteSteps = mergeStepEntries(
      data.map((entry: any) => ({
        date: normalizeDate(entry.date),
        steps: Number(entry.steps) || 0,
      }))
    )
    saveSteps(alias, remoteSteps)
    return remoteSteps
  } catch {
    return localSteps
  }
}

export async function addStepsAsync(alias: string, steps: number): Promise<StepEntry[]> {
  addSteps(alias, steps)
  if (!isSupabaseConfigured()) return getSteps(alias)

  try {
    const participantId = await getParticipantId(alias)
    if (!participantId) return getSteps(alias)

    const supabase = getSupabaseClient()
    const today = new Date().toISOString().split("T")[0]
    const { data: existing, error: existingError } = await supabase
      .from("activity_logs")
      .select("id, steps")
      .eq("participant_id", participantId)
      .eq("date", today)
      .maybeSingle()

    if (shouldUseLocalFallback(existingError)) return getSteps(alias)

    if (existing?.id) {
      const { error } = await supabase
        .from("activity_logs")
        .update({ steps: (Number(existing.steps) || 0) + steps })
        .eq("id", existing.id)

      if (error) return getSteps(alias)
    } else {
      const { error } = await supabase
        .from("activity_logs")
        .insert([{ participant_id: participantId, steps, date: today }])

      if (error) return getSteps(alias)
    }

    return getStepsAsync(alias)
  } catch {
    return getSteps(alias)
  }
}

export async function getWeeklyStepsAsync(alias: string): Promise<StepEntry[]> {
  await getStepsAsync(alias)
  return getWeeklySteps(alias)
}

export async function getWeeklyTotalAsync(alias: string): Promise<number> {
  return (await getWeeklyStepsAsync(alias)).reduce((sum, e) => sum + e.steps, 0)
}

// Gamification
export function getPoints(alias: string): number {
  const allSteps = getSteps(alias)
  const total = allSteps.reduce((sum, e) => sum + e.steps, 0)
  return Math.floor(total / 100)
}

export function getStreak(alias: string): number {
  const entries = getSteps(alias).sort((a, b) => b.date.localeCompare(a.date))
  let streak = 0
  const today = new Date()

  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split("T")[0]
    const entry = entries.find((e) => e.date === dateStr)
    if (entry && entry.steps >= 5000) {
      streak++
    } else if (i === 0) {
      // today hasn't been logged yet, skip
      continue
    } else {
      break
    }
  }
  return streak
}

export function getLevel(points: number): { name: string; min: number; max: number } {
  if (points >= 1500) return { name: "Champion", min: 1500, max: 3000 }
  if (points >= 500) return { name: "Active", min: 500, max: 1500 }
  return { name: "Beginner", min: 0, max: 500 }
}

export async function getPointsAsync(alias: string): Promise<number> {
  await getStepsAsync(alias)
  return getPoints(alias)
}

export async function getStreakAsync(alias: string): Promise<number> {
  await getStepsAsync(alias)
  return getStreak(alias)
}

export async function getAdherenceAsync(alias: string): Promise<number> {
  await getStepsAsync(alias)
  return getAdherence(alias)
}

export function getAdherence(alias: string): number {
  const entries = getSteps(alias)
  if (entries.length === 0) return 0
  const daysWithGoal = entries.filter((e) => e.steps >= 5000).length
  return Math.round((daysWithGoal / Math.max(entries.length, 1)) * 100)
}

// Badges
export function getUnlockedBadges(alias: string): Badge[] {
  if (typeof window === "undefined") return []
  const data = localStorage.getItem(`${BADGES_KEY}_${alias}`)
  return data ? JSON.parse(data) : []
}

export function checkAndUnlockBadges(alias: string): Badge[] {
  const unlocked = getUnlockedBadges(alias)
  const unlockedIds = new Set(unlocked.map((b) => b.id))
  const newBadges: Badge[] = []
  const entries = getSteps(alias)
  const points = getPoints(alias)
  const streak = getStreak(alias)
  const weeklyTotal = getWeeklyTotal(alias)

  const checks: { id: string; condition: boolean }[] = [
    { id: "first-steps", condition: entries.length > 0 },
    { id: "week-warrior", condition: entries.length >= 7 },
    { id: "goal-crusher", condition: weeklyTotal >= 35000 },
    { id: "streak-starter", condition: streak >= 3 },
    { id: "streak-master", condition: streak >= 7 },
    { id: "point-collector", condition: points >= 500 },
    { id: "champion", condition: points >= 1500 },
    { id: "ten-k-day", condition: entries.some((e) => e.steps >= 10000) },
  ]

  for (const check of checks) {
    if (check.condition && !unlockedIds.has(check.id)) {
      const badge = BADGES.find((b) => b.id === check.id)!
      const unlockedBadge = { ...badge, unlockedAt: new Date().toISOString() }
      newBadges.push(unlockedBadge)
      unlocked.push(unlockedBadge)
    }
  }

  localStorage.setItem(`${BADGES_KEY}_${alias}`, JSON.stringify(unlocked))
  return newBadges
}

export async function getUnlockedBadgesAsync(alias: string): Promise<Badge[]> {
  const localBadges = getUnlockedBadges(alias)
  if (!isSupabaseConfigured()) return localBadges

  try {
    const participantId = await getParticipantId(alias)
    if (!participantId) return localBadges

    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from("participant_badges")
      .select("badge_id, name, description, icon, unlocked_at")
      .eq("participant_id", participantId)
      .order("unlocked_at", { ascending: true })

    if (error || !data) return localBadges

    const remoteBadges = data.map((badge: any) => ({
      id: badge.badge_id,
      name: badge.name,
      description: badge.description,
      icon: badge.icon,
      unlockedAt: badge.unlocked_at,
    }))

    localStorage.setItem(`${BADGES_KEY}_${alias}`, JSON.stringify(remoteBadges))
    return remoteBadges
  } catch {
    return localBadges
  }
}

export async function checkAndUnlockBadgesAsync(alias: string): Promise<Badge[]> {
  const newBadges = checkAndUnlockBadges(alias)
  if (!isSupabaseConfigured() || newBadges.length === 0) return newBadges

  try {
    const participantId = await getParticipantId(alias)
    if (!participantId) return newBadges

    const supabase = getSupabaseClient()
    const rows = newBadges.map((badge) => ({
      participant_id: participantId,
      badge_id: badge.id,
      name: badge.name,
      description: badge.description,
      icon: badge.icon,
      unlocked_at: badge.unlockedAt,
    }))

    const { error } = await supabase
      .from("participant_badges")
      .upsert(rows, { onConflict: "participant_id,badge_id" })

    if (error && !shouldUseLocalFallback(error)) {
      console.error("Badge sync failed:", error)
    }
  } catch {
    return newBadges
  }

  return newBadges
}

// Messages
export function getMessages(alias: string): Message[] {
  if (typeof window === "undefined") return []
  const data = localStorage.getItem(MESSAGES_KEY)
  const all: Message[] = data ? JSON.parse(data) : []
  return all.filter((m) => m.to === alias || m.from === alias)
}

export function getMessagesFor(alias: string): Message[] {
  if (typeof window === "undefined") return []
  const data = localStorage.getItem(MESSAGES_KEY)
  const all: Message[] = data ? JSON.parse(data) : []
  return all.filter((m) => m.to === alias)
}

export function sendMessage(from: string, to: string, text: string) {
  if (typeof window === "undefined") return
  const data = localStorage.getItem(MESSAGES_KEY)
  const all: Message[] = data ? JSON.parse(data) : []
  all.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    from,
    to,
    text,
    timestamp: new Date().toISOString(),
  })
  localStorage.setItem(MESSAGES_KEY, JSON.stringify(all))
}

export async function getMessagesForAsync(alias: string): Promise<Message[]> {
  const localMessages = getMessagesFor(alias)
  if (!isSupabaseConfigured()) return localMessages

  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from("support_messages")
      .select("id, from_alias, to_alias, text, created_at")
      .eq("to_alias", alias)
      .order("created_at", { ascending: false })

    if (error || !data) return localMessages

    const remoteMessages = data.map((message: any) => ({
      id: String(message.id),
      from: message.from_alias,
      to: message.to_alias,
      text: message.text,
      timestamp: message.created_at,
    }))

    const allLocal = getMessages(alias).filter((message) => message.to !== alias)
    localStorage.setItem(MESSAGES_KEY, JSON.stringify([...allLocal, ...remoteMessages]))
    return remoteMessages
  } catch {
    return localMessages
  }
}

export async function sendMessageAsync(from: string, to: string, text: string) {
  sendMessage(from, to, text)
  if (!isSupabaseConfigured()) return

  try {
    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from("support_messages")
      .insert([{ from_alias: from, to_alias: to, text }])

    if (error && !shouldUseLocalFallback(error)) {
      console.error("Support message sync failed:", error)
    }
  } catch {
    return
  }
}

// Engagement score
export function getEngagementScore(alias: string): number {
  const entries = getSteps(alias)
  const points = getPoints(alias)
  const streak = getStreak(alias)
  const badges = getUnlockedBadges(alias).length

  const daysLogged = entries.length
  const score = Math.min(100, Math.round(
    (daysLogged * 5) + (streak * 10) + (badges * 8) + (points * 0.05)
  ))
  return score
}

// CSV export
export function exportCSV(): string {
  const users = getUsers()
  const rows = ["alias,group,weeklySteps,points,streak,badgeCount,engagementScore"]

  for (const user of users) {
    if (user.role !== "participant") continue
    const weekly = getWeeklyTotal(user.alias)
    const points = getPoints(user.alias)
    const streak = getStreak(user.alias)
    const badges = getUnlockedBadges(user.alias).length
    const engagement = getEngagementScore(user.alias)
    rows.push(`${user.alias},${user.group || "none"},${weekly},${points},${streak},${badges},${engagement}`)
  }

  return rows.join("\n")
}

export async function exportCSVAsync(): Promise<string> {
  const users = await getUsersAsync()
  const rows = ["alias,group,weeklySteps,points,streak,badgeCount,engagementScore"]

  for (const user of users) {
    if (user.role !== "participant") continue
    const [weekly, points, streak, badges, engagement] = await Promise.all([
      getWeeklyTotalAsync(user.alias),
      getPointsAsync(user.alias),
      getStreakAsync(user.alias),
      getUnlockedBadgesAsync(user.alias),
      getEngagementScoreAsync(user.alias),
    ])
    rows.push(`${user.alias},${user.group || "none"},${weekly},${points},${streak},${badges.length},${engagement}`)
  }

  return rows.join("\n")
}

export async function getEngagementScoreAsync(alias: string): Promise<number> {
  await Promise.all([getStepsAsync(alias), getUnlockedBadgesAsync(alias)])
  return getEngagementScore(alias)
}

export function updateUserGroup(alias: string, group: Group) {
  const users = getUsers()
  const idx = users.findIndex((u) => u.alias === alias)
  if (idx >= 0) {
    users[idx].group = group
    localStorage.setItem(USERS_KEY, JSON.stringify(users))
  }
}

export async function updateUserGroupAsync(alias: string, group: Group) {
  updateUserGroup(alias, group)
  if (!isSupabaseConfigured()) return

  try {
    const participantId = await getParticipantId(alias)
    if (!participantId) return

    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from("participants")
      .update({ group_type: group })
      .eq("id", participantId)

    if (error && !shouldUseLocalFallback(error)) {
      console.error("Group sync failed:", error)
    }
  } catch {
    return
  }
}
