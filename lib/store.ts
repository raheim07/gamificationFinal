// Types
export type Role = "participant" | "support" | "admin"
export type Group = "control" | "intervention"

export interface User {
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

export function updateUserGroup(alias: string, group: Group) {
  const users = getUsers()
  const idx = users.findIndex((u) => u.alias === alias)
  if (idx >= 0) {
    users[idx].group = group
    localStorage.setItem(USERS_KEY, JSON.stringify(users))
  }
}
