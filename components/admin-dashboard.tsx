"use client"

import { useEffect, useCallback, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  getUsers, getWeeklyTotal, getPoints, getStreak,
  getUnlockedBadges, getEngagementScore, exportCSV,
  updateUserGroup, Group, getAdherence,
  getUsersAsync, getWeeklyTotalAsync, getPointsAsync,
  getStreakAsync, getUnlockedBadgesAsync, getEngagementScoreAsync,
  exportCSVAsync, updateUserGroupAsync, getAdherenceAsync,
} from "@/lib/store"
import { ShieldCheck, Download, BarChart3, Users, ArrowRightLeft, Eye } from "lucide-react"

const card = {
  initial: { opacity: 0, y: 20 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
}

export function AdminDashboard() {
  const [users, setUsers] = useState(getUsers())
  const [comparisonMode, setComparisonMode] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const participants = users.filter((u) => u.role === "participant")
  const controlUsers = participants.filter((u) => u.group === "control")
  const interventionUsers = participants.filter((u) => u.group === "intervention")

  const refreshAdminData = useCallback(async () => {
    const nextUsers = await getUsersAsync()
    const participants = nextUsers.filter((u) => u.role === "participant")

    await Promise.all(
      participants.map((participant) =>
        Promise.all([
          getWeeklyTotalAsync(participant.alias),
          getPointsAsync(participant.alias),
          getStreakAsync(participant.alias),
          getUnlockedBadgesAsync(participant.alias),
          getEngagementScoreAsync(participant.alias),
          getAdherenceAsync(participant.alias),
        ])
      )
    )

    setUsers(await getUsersAsync())
  }, [])

  useEffect(() => {
    refreshAdminData()
  }, [refreshAdminData])

  const handleExportCSV = async () => {
    setIsExporting(true)
    const csv = await exportCSVAsync()
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "study_data.csv"
    a.click()
    URL.revokeObjectURL(url)
    setIsExporting(false)
  }

  const handleToggleGroup = async (alias: string) => {
    const user = users.find((u) => u.alias === alias)
    if (!user || user.role !== "participant") return
    const newGroup: Group = user.group === "control" ? "intervention" : "control"
    await updateUserGroupAsync(alias, newGroup)
    await refreshAdminData()
  }

  const getGroupStats = (group: "control" | "intervention") => {
    const groupUsers = participants.filter((u) => u.group === group)
    if (groupUsers.length === 0) return { avgSteps: 0, avgPoints: 0, avgStreak: 0, avgEngagement: 0 }
    const totalSteps = groupUsers.reduce((s, u) => s + getWeeklyTotal(u.alias), 0)
    const totalPoints = groupUsers.reduce((s, u) => s + getPoints(u.alias), 0)
    const totalStreak = groupUsers.reduce((s, u) => s + getStreak(u.alias), 0)
    const totalEngagement = groupUsers.reduce((s, u) => s + getEngagementScore(u.alias), 0)
    return {
      avgSteps: Math.round(totalSteps / groupUsers.length),
      avgPoints: Math.round(totalPoints / groupUsers.length),
      avgStreak: Math.round(totalStreak / groupUsers.length),
      avgEngagement: Math.round(totalEngagement / groupUsers.length),
    }
  }

  const controlStats = getGroupStats("control")
  const interventionStats = getGroupStats("intervention")

  return (
    <div className="space-y-4 sm:space-y-5">
      <motion.div custom={0} variants={card} initial="initial" animate="animate" className="flex flex-col sm:flex-row items-start sm:justify-between gap-3 sm:gap-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="h-5 w-5" style={{ color: "#0EA5A4" }} />
            <h2 className="font-[var(--font-montserrat)] text-lg font-bold tracking-wide" style={{ color: "var(--text-primary)" }}>
              Admin Panel
            </h2>
          </div>
          <p className="text-sm" style={{ color: "var(--text-dim)" }}>Manage participants and export data</p>
        </div>
        <div className="flex gap-2">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setComparisonMode(!comparisonMode)}
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
            disabled={isExporting}
            className="rounded-xl px-4 py-2 text-xs font-medium transition-all duration-300 flex items-center gap-1.5"
            style={{
              background: "linear-gradient(135deg, #0EA5A4, #06B6D4)",
              color: "#0F172A",
            }}
          >
            <Download className="h-3.5 w-3.5" />
            {isExporting ? "Exporting..." : "Export CSV"}
          </motion.button>
        </div>
      </motion.div>

      {/* Overview */}
      <motion.div custom={1} variants={card} initial="initial" animate="animate" className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { icon: <Users className="h-5 w-5" />, val: users.length, label: "Total Users", color: "#0EA5A4" },
          { icon: <BarChart3 className="h-5 w-5" />, val: controlUsers.length, label: "Control", color: "#94A3B8" },
          { icon: <BarChart3 className="h-5 w-5" />, val: interventionUsers.length, label: "Intervention", color: "#06B6D4" },
        ].map((stat) => (
          <div key={stat.label} className="glass-card rounded-2xl p-3 sm:p-4 text-center">
            <div className="mx-auto mb-1 flex justify-center" style={{ color: stat.color }}>{stat.icon}</div>
            <p className="font-[var(--font-montserrat)] text-xl sm:text-2xl font-light" style={{ color: "var(--text-primary)" }}>{stat.val}</p>
            <p className="text-xs" style={{ color: "var(--text-dim)" }}>{stat.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Comparison Mode */}
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
              <h3 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: "var(--text-secondary)" }}>Group Comparison</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {[
                  { label: "Control", stats: controlStats, color: "#94A3B8" },
                  { label: "Intervention", stats: interventionStats, color: "#0EA5A4" },
                ].map((group) => (
                  <div key={group.label}>
                    <h4
                      className="text-[11px] uppercase tracking-widest mb-3 font-medium"
                      style={{ color: group.color }}
                    >
                      {group.label}
                    </h4>
                    <div className="space-y-2.5">
                      {[
                        { label: "Avg Weekly Steps", val: group.stats.avgSteps.toLocaleString() },
                        { label: "Avg Points", val: `${group.stats.avgPoints}` },
                        { label: "Avg Streak", val: `${group.stats.avgStreak}d` },
                        { label: "Avg Engagement", val: `${group.stats.avgEngagement}%` },
                      ].map((row) => (
                        <div key={row.label} className="flex justify-between text-sm">
                          <span style={{ color: "var(--text-dim)" }}>{row.label}</span>
                          <span className="font-medium" style={{ color: "var(--text-primary)" }}>{row.val}</span>
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

      {/* Users Table */}
      <motion.div custom={2} variants={card} initial="initial" animate="animate" className="glass-card rounded-2xl p-4 sm:p-5">
        <h3 className="text-xs font-medium mb-4" style={{ color: "var(--text-secondary)" }}>All Users</h3>
        {users.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No users registered yet.</p>
        ) : (
          <div className="space-y-2">
            {users.map((u, idx) => {
              const weekly = u.role === "participant" ? getWeeklyTotal(u.alias) : 0
              const pts = u.role === "participant" ? getPoints(u.alias) : 0
              const strk = u.role === "participant" ? getStreak(u.alias) : 0
              const badges = u.role === "participant" ? getUnlockedBadges(u.alias).length : 0
              const engagement = u.role === "participant" ? getEngagementScore(u.alias) : 0
              const adherenceVal = u.role === "participant" ? getAdherence(u.alias) : 0

              return (
                <motion.div
                  key={u.alias}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="rounded-xl p-3.5"
                  style={{ background: "var(--surface-card)", border: "1px solid var(--border-faint)" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{u.alias}</span>
                      <span
                        className="text-[10px] capitalize px-2 py-0.5 rounded-full"
                        style={{ background: "var(--surface-tag)", color: "var(--text-muted)" }}
                      >
                        {u.role}
                      </span>
                      {u.group && (
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full capitalize"
                          style={{
                            background: u.group === "intervention" ? "var(--surface-selected)" : "var(--surface-tag)",
                            color: u.group === "intervention" ? "#0EA5A4" : "#94A3B8",
                          }}
                        >
                          {u.group}
                        </span>
                      )}
                    </div>
                    {u.role === "participant" && (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleToggleGroup(u.alias)}
                        className="text-[11px] flex items-center gap-1 transition-all duration-300"
                        style={{ color: "var(--text-dim)" }}
                        title="Toggle group"
                      >
                        <ArrowRightLeft className="h-3 w-3" />
                        Toggle
                      </motion.button>
                    )}
                  </div>
                  {u.role === "participant" && (
                    <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 lg:grid-cols-6">
                      {[
                        { label: "Weekly", val: weekly.toLocaleString() },
                        { label: "Points", val: `${pts}` },
                        { label: "Streak", val: `${strk}d` },
                        { label: "Badges", val: `${badges}` },
                        { label: "Adherence", val: `${adherenceVal}%` },
                        { label: "Engagement", val: `${engagement}%` },
                      ].map((stat) => (
                        <div key={stat.label}>
                          <span style={{ color: "var(--text-dim)" }}>{stat.label}</span>
                          <p className="font-medium" style={{ color: "var(--text-primary)" }}>{stat.val}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      </motion.div>

      {/* Submit Study Data */}
      <motion.div custom={3} variants={card} initial="initial" animate="animate" className="glass-card rounded-2xl p-4 sm:p-5">
        <h3 className="text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Submit Study Data</h3>
        <p className="text-xs mb-3" style={{ color: "var(--text-dim)" }}>
          Export all participant data for analysis.
        </p>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleExportCSV}
          className="w-full rounded-xl py-3 text-sm font-semibold transition-all duration-300"
          style={{
            background: "linear-gradient(135deg, #0EA5A4 0%, #06B6D4 100%)",
            color: "#0F172A",
            boxShadow: "0 4px 20px -4px rgba(14,165,164,0.3)",
          }}
        >
          {isExporting ? "Exporting..." : "Export Study Data"}
        </motion.button>
      </motion.div>
    </div>
  )
}
