"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { BADGES } from "@/lib/store"
import {
  ShieldCheck,
  Download,
  BarChart3,
  Users,
  ArrowRightLeft,
  Eye,
  AlertCircle,
  RefreshCw,
} from "lucide-react"
import { supabase } from "@/src/lib/supabaseClient"
import { getWeeklyActivity, getParticipantStats } from "@/src/services/activityService"

// ── Animation variants ────────────────────────────────────────────────────────

const card = {
  initial: { opacity: 0, y: 20 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
}

// ── Badge count — derived from live stats, mirrors intervention-dashboard ─────
// getParticipantStats returns:
//   { total_steps, total_points, current_streak, adherence, has_ten_k_day, total_days_logged }
// Badges are NEVER stored in a table; they are always computed from these values.

function deriveBadgeCount(
  stats: {
    total_steps: number
    total_points: number
    current_streak: number
    adherence: number
    has_ten_k_day: boolean
    total_days_logged: number
  },
  weeklyTotal: number
): number {
  let count = 0
  for (const badge of BADGES) {
    let earned = false
    switch (badge.id) {
      case "first-steps":
        earned = stats.total_steps >= 1
        break
      case "streak-starter":
        earned = stats.current_streak >= 3
        break
      case "streak-master":
        earned = stats.current_streak >= 7
        break
      case "goal-crusher":
        earned = weeklyTotal >= 35000
        break
      case "ten-k-day":
        earned = stats.has_ten_k_day
        break
      case "point-collector":
        earned = stats.total_points >= 500
        break
      case "champion":
        earned = stats.total_points >= 1500
        break
      case "steps_50k":
        earned = stats.total_steps >= 50000
        break
      default:
        earned = stats.total_points >= (BADGES.indexOf(badge) + 1) * 100
    }
    if (earned) count++
  }
  return count
}

// Engagement = % of days they've logged steps out of a rolling 30-day window.
// Uses total_days_logged which is returned directly by getParticipantStats.
function computeEngagement(totalDaysLogged: number, studyDurationDays = 30): number {
  if (studyDurationDays <= 0) return 0
  return Math.min(100, Math.round((totalDaysLogged / studyDurationDays) * 100))
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface DbParticipant {
  id: string
  alias: string
  support_code: string
  group_type: "control" | "intervention" | null
  created_at: string
}

interface DbSupportUser {
  id: string
  alias: string
  participant_id: string
  created_at: string
}

interface ParticipantRow {
  alias: string
  group: "control" | "intervention" | null
  weekly_steps: number
  total_points: number
  current_streak: number
  badges_count: number
  adherence: number
  engagement: number
  support_messages_count: number
}

interface GroupAverages {
  avgSteps: number
  avgPoints: number
  avgStreak: number
  avgEngagement: number
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AdminDashboard() {
  const [participants, setParticipants] = useState<ParticipantRow[]>([])
  const [supportUsers, setSupportUsers] = useState<DbSupportUser[]>([])
  const [idToAlias, setIdToAlias] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [comparisonMode, setComparisonMode] = useState(false)
  const [togglingAlias, setTogglingAlias] = useState<string | null>(null)

  // ── Load all data ──────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    setLoadError("")
    const { data: messages } = await supabase
    .from("messages")
    .select("participant_id")
    const supportMessageCounts = (messages ?? []).reduce((acc, msg) => {
      acc[msg.participant_id] = (acc[msg.participant_id] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)

    try {
      const [participantsRes, supportRes] = await Promise.all([
        supabase
          .from("participants")
          .select("id, alias, support_code, group_type, created_at")
          .order("created_at", { ascending: true }),
        supabase
          .from("support_users")
          .select("id, alias, participant_id, created_at")
          .order("created_at", { ascending: true }),
      ])

      if (participantsRes.error) throw participantsRes.error
      if (supportRes.error) throw supportRes.error

      const rawParticipants: DbParticipant[] = participantsRes.data ?? []
      setSupportUsers(supportRes.data ?? [])

      // Build id → alias lookup for support user display
      const map: Record<string, string> = {}
      rawParticipants.forEach((p) => { map[p.id] = p.alias })
      setIdToAlias(map)

      // Fetch activity + stats for every participant, then derive all metrics
      const rows = await Promise.all(
        rawParticipants.map(async (p) => {
          const [weekly, stats] = await Promise.all([
            getWeeklyActivity(p.alias),
            getParticipantStats(p.alias),
          ])

          const weeklyTotal: number = (weekly as { date: string; steps: number }[]).reduce(
            (sum, d) => sum + (d.steps || 0),
            0
          )

          return {
            alias: p.alias,
            group: p.group_type,
            weekly_steps: weeklyTotal,
            total_points: stats.total_points ?? 0,
            current_streak: stats.current_streak ?? 0,
            badges_count: deriveBadgeCount(stats, weeklyTotal),
            adherence: stats.adherence ?? 0,
            engagement: computeEngagement(stats.total_days_logged ?? 0),
            support_messages_count: supportMessageCounts[p.id] ?? 0,
          } satisfies ParticipantRow
        })
      )

      setParticipants(rows)
    } catch (err) {
      console.error("Admin dashboard load error:", err)
      setLoadError("Failed to load participant data. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ── Toggle group ───────────────────────────────────────────────────────────
  const handleToggleGroup = async (alias: string) => {
    const p = participants.find((u) => u.alias === alias)
    if (!p) return

    const newGroup: "control" | "intervention" =
      p.group === "control" ? "intervention" : "control"

    setTogglingAlias(alias)
    try {
      const { error } = await supabase
        .from("participants")
        .update({ group_type: newGroup })
        .eq("alias", alias)

      if (error) throw error

      setParticipants((prev) =>
        prev.map((u) => (u.alias === alias ? { ...u, group: newGroup } : u))
      )
    } catch (err) {
      console.error("Error toggling group:", err)
    } finally {
      setTogglingAlias(null)
    }
  }

  // ── Export CSV ─────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const headers = [
      "Alias",
      "Group",
      "Weekly Steps",
      "Points",
      "Streak",
      "Badges",
      "Support Messages",
      "Adherence %",
      "Engagement %",
    ]

    const rows = participants.map((p) => [
      p.alias,
      p.group ?? "unassigned",
      p.weekly_steps,
      p.total_points,
      p.current_streak,
      p.badges_count,
      p.support_messages_count ?? 0,
      p.adherence,
      p.engagement,
    ])
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "study_data.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Group averages ─────────────────────────────────────────────────────────
  const DAYS_RECORDED = 16
const DAYS_IN_WEEK = 7

const groupAverages = (group: "control" | "intervention"): GroupAverages => {
  const members = participants.filter((p) => p.group === group)

  if (members.length === 0) {
    return { avgSteps: 0, avgPoints: 0, avgStreak: 0, avgEngagement: 0 }
  }

  const n = members.length

  return {
    avgSteps: Math.round(
      members.reduce((s, p) => s + ((p.weekly_steps / DAYS_RECORDED) * DAYS_IN_WEEK), 0) / n
    ),

    avgPoints: Math.round(
      members.reduce((s, p) => s + p.total_points, 0) / n
    ),

    avgStreak: Math.round(
      members.reduce((s, p) => s + p.current_streak, 0) / n
    ),

    avgEngagement: Math.round(
      members.reduce((s, p) => s + p.engagement, 0) / n
    ),
  }
}

  const controlAvg = groupAverages("control")
  const interventionAvg = groupAverages("intervention")
  const controlMembers = participants.filter((p) => p.group === "control")
  const interventionMembers = participants.filter((p) => p.group === "intervention")
  const totalUsers = participants.length + supportUsers.length

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 sm:space-y-5">

      {/* Header */}
      <motion.div
        custom={0} variants={card} initial="initial" animate="animate"
        className="flex flex-col sm:flex-row items-start sm:justify-between gap-3 sm:gap-0"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="h-5 w-5" style={{ color: "#0EA5A4" }} />
            <h2
              className="font-[var(--font-montserrat)] text-lg font-bold tracking-wide"
              style={{ color: "var(--text-primary)" }}
            >
              Admin Panel
            </h2>
          </div>
          <p className="text-sm" style={{ color: "var(--text-dim)" }}>
            Manage participants and export data
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={loadData}
            disabled={loading}
            className="rounded-xl px-4 py-2 text-xs font-medium transition-all duration-300 flex items-center gap-1.5 disabled:opacity-50"
            style={{ background: "var(--surface-subtle)", color: "#94A3B8" }}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setComparisonMode((v) => !v)}
            className="rounded-xl px-4 py-2 text-xs font-medium transition-all duration-300 flex items-center gap-1.5"
            style={{
              background: comparisonMode ? "var(--surface-selected)" : "var(--surface-subtle)",
              color: comparisonMode ? "#0EA5A4" : "#94A3B8",
              border: comparisonMode ? "1px solid rgba(14,165,164,0.2)" : "1px solid transparent",
            }}
          >
            <Eye className="h-3.5 w-3.5" />
            {comparisonMode ? "Hide" : "Compare"}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleExportCSV}
            disabled={loading || participants.length === 0}
            className="rounded-xl px-4 py-2 text-xs font-medium transition-all duration-300 flex items-center gap-1.5 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #0EA5A4, #06B6D4)", color: "#0F172A" }}
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </motion.button>
        </div>
      </motion.div>

      {/* Error */}
      {loadError && (
        <motion.div
          custom={1} variants={card} initial="initial" animate="animate"
          className="glass-card rounded-2xl p-5 flex items-start gap-3"
          style={{ border: "1px solid rgba(248,113,113,0.2)" }}
        >
          <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" style={{ color: "#F87171" }} />
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{loadError}</p>
        </motion.div>
      )}

      {/* Overview cards */}
      <motion.div
        custom={1} variants={card} initial="initial" animate="animate"
        className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3"
      >
        {[
          { icon: <Users className="h-5 w-5" />, val: totalUsers, label: "Total Users", color: "#0EA5A4" },
          { icon: <BarChart3 className="h-5 w-5" />, val: controlMembers.length, label: "Control", color: "#94A3B8" },
          { icon: <BarChart3 className="h-5 w-5" />, val: interventionMembers.length, label: "Intervention", color: "#06B6D4" },
          { icon: <BarChart3 className="h-5 w-5" />, val: supportUsers.length, label: "Support Users", color: "#06B6D4" },
        ].map((stat) => (
          <div key={stat.label} className="glass-card rounded-2xl p-3 sm:p-4 text-center">
            <div className="mx-auto mb-1 flex justify-center" style={{ color: stat.color }}>
              {stat.icon}
            </div>
            <p
              className="font-[var(--font-montserrat)] text-xl sm:text-2xl font-light"
              style={{ color: "var(--text-primary)" }}
            >
              {loading ? "…" : stat.val}
            </p>
            <p className="text-xs" style={{ color: "var(--text-dim)" }}>{stat.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Group comparison */}
      <AnimatePresence>
        {comparisonMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div
              className="glass-card rounded-2xl p-4 sm:p-5"
              style={{ border: "1px solid rgba(14,165,164,0.12)" }}
            >
              <h3
                className="text-xs font-bold uppercase tracking-wider mb-4"
                style={{ color: "var(--text-secondary)" }}
              >
                Group Comparison
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {[
                  { label: "Control", count: controlMembers.length, avgs: controlAvg, color: "#94A3B8" },
                  { label: "Intervention", count: interventionMembers.length, avgs: interventionAvg, color: "#0EA5A4" },
                ].map((g) => (
                  <div key={g.label}>
                    <div className="flex items-center gap-2 mb-3">
                      <h4
                        className="text-[11px] uppercase tracking-widest font-medium"
                        style={{ color: g.color }}
                      >
                        {g.label}
                      </h4>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full"
                        style={{ background: "var(--surface-tag)", color: "var(--text-dim)" }}
                      >
                        n={g.count}
                      </span>
                    </div>
                    <div className="space-y-2.5">
                      {[
                        { label: "Avg Weekly Steps", val: g.avgs.avgSteps.toLocaleString() },
                        { label: "Avg Points", val: String(g.avgs.avgPoints) },
                        { label: "Avg Streak", val: `${g.avgs.avgStreak}d` },
                        { label: "Avg Engagement", val: `${g.avgs.avgEngagement}%` },
                      ].map((row) => (
                        <div key={row.label} className="flex justify-between text-sm">
                          <span style={{ color: "var(--text-dim)" }}>{row.label}</span>
                          <span className="font-medium" style={{ color: "var(--text-primary)" }}>
                            {row.val}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Participants */}
      <motion.div
        custom={2} variants={card} initial="initial" animate="animate"
        className="glass-card rounded-2xl p-4 sm:p-5"
      >
        <h3 className="text-xs font-medium mb-4" style={{ color: "var(--text-secondary)" }}>
          Participants
        </h3>

        {loading ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading…</p>
        ) : participants.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No participants registered yet.</p>
        ) : (
          <div className="space-y-2">
            {participants.map((p, idx) => (
              <motion.div
                key={p.alias}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-xl p-3.5"
                style={{ background: "var(--surface-card)", border: "1px solid var(--border-faint)" }}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      {p.alias}
                    </span>
                    <span
                      className="text-[10px] capitalize px-2 py-0.5 rounded-full"
                      style={{ background: "var(--surface-tag)", color: "var(--text-muted)" }}
                    >
                      participant
                    </span>
                    {p.group ? (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full capitalize"
                        style={{
                          background: p.group === "intervention" ? "var(--surface-selected)" : "var(--surface-tag)",
                          color: p.group === "intervention" ? "#0EA5A4" : "#94A3B8",
                        }}
                      >
                        {p.group}
                      </span>
                    ) : (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{ background: "var(--surface-tag)", color: "#F87171" }}
                      >
                        unassigned
                      </span>
                    )}
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleToggleGroup(p.alias)}
                    disabled={togglingAlias === p.alias}
                    className="text-[11px] flex items-center gap-1 rounded-lg px-2 py-1 transition-all duration-200 disabled:opacity-50"
                    style={{ color: "var(--text-dim)", background: "var(--surface-subtle)" }}
                    title={`Move to ${p.group === "control" ? "intervention" : "control"}`}
                  >
                    <ArrowRightLeft className="h-3 w-3" />
                    {togglingAlias === p.alias
                      ? "Saving…"
                      : p.group === "control"
                      ? "→ Intervention"
                      : p.group === "intervention"
                      ? "→ Control"
                      : "Assign"}
                  </motion.button>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs sm:grid-cols-6">
                  {[
                    { label: "Weekly Steps", val: p.weekly_steps.toLocaleString() },
                    { label: "Points", val: String(p.total_points) },
                    { label: "Streak", val: `${p.current_streak}d` },
                    { label: "Badges", val: `${p.badges_count}/${BADGES.length}` },
                    { label: "Adherence", val: `${p.adherence}%` },
                    { label: "Engagement", val: `${p.engagement}%` },
                  ].map((stat) => (
                    <div key={stat.label}>
                      <span style={{ color: "var(--text-dim)" }}>{stat.label}</span>
                      <p className="font-medium mt-0.5" style={{ color: "var(--text-primary)" }}>
                        {stat.val}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Support Users */}
      <motion.div
        custom={3} variants={card} initial="initial" animate="animate"
        className="glass-card rounded-2xl p-4 sm:p-5"
      >
        <h3 className="text-xs font-medium mb-4" style={{ color: "var(--text-secondary)" }}>
          Support Users
        </h3>

        {loading ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading…</p>
        ) : supportUsers.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No support users registered yet.</p>
        ) : (
          <div className="space-y-2">
            {supportUsers.map((s, idx) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.35 }}
                className="rounded-xl p-3.5 flex items-center justify-between"
                style={{ background: "var(--surface-card)", border: "1px solid var(--border-faint)" }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {s.alias}
                  </span>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{ background: "var(--surface-tag)", color: "var(--text-muted)" }}
                  >
                    support
                  </span>
                </div>
                <span className="text-xs" style={{ color: "var(--text-dim)" }}>
                  {idToAlias[s.participant_id]
                    ? `Linked to: ${idToAlias[s.participant_id]}`
                    : s.participant_id
                    ? `ID: ${s.participant_id}`
                    : "No participant linked"}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Export */}
      <motion.div
        custom={4} variants={card} initial="initial" animate="animate"
        className="glass-card rounded-2xl p-4 sm:p-5"
      >
        <h3 className="text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
          Submit Study Data
        </h3>
        <p className="text-xs mb-3" style={{ color: "var(--text-dim)" }}>
          Export all participant data for analysis.
        </p>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleExportCSV}
          disabled={loading || participants.length === 0}
          className="w-full rounded-xl py-3 text-sm font-semibold transition-all duration-300 disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, #0EA5A4 0%, #06B6D4 100%)",
            color: "#0F172A",
            boxShadow: "0 4px 20px -4px rgba(14,165,164,0.3)",
          }}
        >
          Export Study Data
        </motion.button>
      </motion.div>

    </div>
  )
}
