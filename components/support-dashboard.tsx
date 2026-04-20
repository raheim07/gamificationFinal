"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  User, getUsers, getWeeklySteps, getWeeklyTotal,
  getStreak, getPoints, sendMessage, getLevel,
  getUsersAsync, getWeeklyStepsAsync, getWeeklyTotalAsync,
  getStreakAsync, getPointsAsync, sendMessageAsync,
} from "@/lib/store"
import { StepChart } from "@/components/step-chart"
import { Users, Send, Flame, Star, Target, BarChart3, CheckCircle } from "lucide-react"

const card = {
  initial: { opacity: 0, y: 20 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
}

interface SupportDashboardProps {
  user: User
}

export function SupportDashboard({ user }: SupportDashboardProps) {
  const [participants, setParticipants] = useState(() => getUsers().filter((u) => u.group === "intervention"))
  const [selectedAlias, setSelectedAlias] = useState<string>(participants[0]?.alias || "")
  const [message, setMessage] = useState("")
  const [sent, setSent] = useState(false)
  const [isSending, setIsSending] = useState(false)

  const selected = participants.find((p) => p.alias === selectedAlias)
  const [weeklyData, setWeeklyData] = useState(selectedAlias ? getWeeklySteps(selectedAlias) : [])
  const [weeklyTotal, setWeeklyTotal] = useState(selectedAlias ? getWeeklyTotal(selectedAlias) : 0)
  const [streak, setStreak] = useState(selectedAlias ? getStreak(selectedAlias) : 0)
  const [points, setPoints] = useState(selectedAlias ? getPoints(selectedAlias) : 0)
  const level = getLevel(points)

  useEffect(() => {
    let isActive = true

    async function loadParticipants() {
      const users = await getUsersAsync()
      if (!isActive) return

      const interventionParticipants = users.filter((u) => u.role === "participant" && u.group === "intervention")
      setParticipants(interventionParticipants)
      if (!selectedAlias && interventionParticipants[0]) {
        setSelectedAlias(interventionParticipants[0].alias)
      }
    }

    loadParticipants()

    return () => {
      isActive = false
    }
  }, [selectedAlias])

  useEffect(() => {
    let isActive = true

    async function loadParticipantStats() {
      if (!selectedAlias) {
        setWeeklyData([])
        setWeeklyTotal(0)
        setStreak(0)
        setPoints(0)
        return
      }

      const [nextWeeklyData, nextWeeklyTotal, nextStreak, nextPoints] = await Promise.all([
        getWeeklyStepsAsync(selectedAlias),
        getWeeklyTotalAsync(selectedAlias),
        getStreakAsync(selectedAlias),
        getPointsAsync(selectedAlias),
      ])

      if (!isActive) return
      setWeeklyData(nextWeeklyData)
      setWeeklyTotal(nextWeeklyTotal)
      setStreak(nextStreak)
      setPoints(nextPoints)
    }

    loadParticipantStats()

    return () => {
      isActive = false
    }
  }, [selectedAlias])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || !selectedAlias) return
    setIsSending(true)
    await sendMessageAsync(user.alias, selectedAlias, message.trim())
    setMessage("")
    setSent(true)
    setIsSending(false)
    setTimeout(() => setSent(false), 2500)
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <motion.div custom={0} variants={card} initial="initial" animate="animate">
        <div className="flex items-center gap-2 mb-1">
          <Users className="h-5 w-5" style={{ color: "#0EA5A4" }} />
          <h2
            className="font-[var(--font-montserrat)] text-lg font-bold tracking-wide"
            style={{ color: "var(--text-primary)" }}
          >
            Support Dashboard
          </h2>
        </div>
        <p className="text-sm" style={{ color: "var(--text-dim)" }}>View and encourage participants</p>
      </motion.div>

      {/* Participant Selector */}
      <motion.div custom={1} variants={card} initial="initial" animate="animate" className="glass-card rounded-2xl p-4 sm:p-5">
        <label className="block text-xs font-medium uppercase tracking-wider mb-2.5" style={{ color: "var(--text-muted)" }}>
          Select Participant
        </label>
        {participants.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No participants registered yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {participants.map((p) => {
              const isSelected = selectedAlias === p.alias
              return (
                <motion.button
                  key={p.alias}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSelectedAlias(p.alias)}
                  className="rounded-xl px-4 py-2 text-sm font-medium transition-all duration-300"
                  style={{
                    background: isSelected ? "var(--surface-selected)" : "var(--surface-subtle)",
                    color: isSelected ? "var(--text-primary)" : "var(--text-muted)",
                    border: isSelected ? "1px solid rgba(14,165,164,0.3)" : "1px solid transparent",
                    boxShadow: isSelected ? "0 0 12px -4px rgba(14,165,164,0.15)" : "none",
                  }}
                >
                  {p.alias}
                  {/* <span className="text-xs ml-1.5 capitalize" style={{ color: "var(--text-dim)" }}>({p.group})</span> */}
                </motion.button>
              )
            })}
          </div>
        )}
      </motion.div>

      <AnimatePresence mode="wait">
        {selected && (
          <motion.div
            key={selectedAlias}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-4"
          >
            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
              {[
                { icon: <BarChart3 className="h-4 w-4" />, label: "Weekly", val: weeklyTotal.toLocaleString() },
                { icon: <Flame className="h-4 w-4" />, label: "Streak", val: `${streak}d` },
                { icon: <Star className="h-4 w-4" />, label: "Points", val: `${points}` },
                { icon: <Target className="h-4 w-4" />, label: "Level", val: level.name },
              ].map((stat) => (
                <div key={stat.label} className="glass-card rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-1" style={{ color: "var(--text-muted)" }}>
                    {stat.icon}
                    <span className="text-xs">{stat.label}</span>
                  </div>
                  <p className="font-[var(--font-montserrat)] text-xl font-light" style={{ color: "var(--text-primary)" }}>{stat.val}</p>
                </div>
              ))}
            </div>

            {/* Weekly Chart */}
            <div className="glass-card rounded-2xl p-4 sm:p-5">
              <h3 className="text-xs font-medium mb-3" style={{ color: "var(--text-secondary)" }}>
                {"Weekly Steps for "}{selectedAlias}
              </h3>
              <StepChart data={weeklyData} animate={true} />
            </div>

            {/* Shared Challenge */}
            <div
              className="glass-card rounded-2xl p-5"
              style={{ border: "1px solid rgba(14,165,164,0.15)" }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, rgba(14,165,164,0.15) 0%, rgba(6,182,212,0.1) 100%)" }}
                >
                  <Target className="h-5 w-5" style={{ color: "#0EA5A4" }} />
                </div>
                <div>
                  <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Shared Weekly Challenge</h3>
                  <p className="text-xs" style={{ color: "var(--text-dim)" }}>Help {selectedAlias} reach 35,000 steps</p>
                </div>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--ring-track)" }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: "linear-gradient(90deg, #0EA5A4, #06B6D4)" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((weeklyTotal / 35000) * 100, 100)}%` }}
                  transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <p className="text-xs mt-1.5" style={{ color: "var(--text-dim)" }}>
                {Math.round((weeklyTotal / 35000) * 100)}% complete
              </p>
            </div>

            {/* Send Message */}
            <div className="glass-card rounded-2xl p-4 sm:p-5">
              <h3 className="text-xs font-medium mb-3 flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                <Send className="h-4 w-4" style={{ color: "#0EA5A4" }} />
                Send Encouragement
              </h3>
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write an encouraging message..."
                  className="flex-1 rounded-xl px-4 py-2.5 text-sm transition-all duration-300 focus:outline-none"
                  style={{ background: "var(--surface-input)", color: "var(--text-primary)" }}
                  onFocus={(e) => e.currentTarget.style.boxShadow = "0 0 0 2px #0EA5A4"}
                  onBlur={(e) => e.currentTarget.style.boxShadow = "none"}
                />
                <motion.button
                  type="submit"
                  disabled={isSending}
                  whileTap={{ scale: 0.97 }}
                  className="rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-300 flex items-center gap-1.5"
                  style={{
                    background: "linear-gradient(135deg, #0EA5A4 0%, #06B6D4 100%)",
                    color: "#0F172A",
                  }}
                >
                  <Send className="h-4 w-4" />
                  {isSending ? "Sending..." : "Send"}
                </motion.button>
              </form>
              <AnimatePresence>
                {sent && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="text-xs mt-2 flex items-center gap-1"
                    style={{ color: "#10B981" }}
                  >
                    <CheckCircle className="h-3 w-3" />
                    Message sent successfully
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
