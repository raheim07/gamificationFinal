"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { User, getLevel } from "@/lib/store"
import { StepChart } from "@/components/step-chart"
import { Users, Send, Flame, Star, Target, BarChart3, CheckCircle, AlertCircle } from "lucide-react"
import { getWeeklyActivity, getParticipantStats } from "@/src/services/activityService"
import { sendSupportMessage } from "@/src/services/messageService"
import { supabase } from "@/src/lib/supabaseClient"

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

interface LinkedParticipant {
  alias: string
  supportCode: string
  weeklyData: { date: string; steps: number }[]
  weeklyTotal: number
  streak: number
  points: number
}

export function SupportDashboard({ user }: SupportDashboardProps) {
  const [participant, setParticipant] = useState<LinkedParticipant | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [sendError, setSendError] = useState("")

  // ── Load the one participant this support user is linked to ──────────────
  // Flow: support_users (by alias) → participant_id → participants row →
  //       activity via activityService
  const loadParticipant = useCallback(async () => {
    setLoading(true)
    setLoadError("")
    try {
      // 1. Find the support_user row for this user
      const { data: supportRow, error: supportErr } = await supabase
        .from("support_users")
        .select("participant_id")
        .ilike("alias", user.alias.trim())
        .single()

      if (supportErr || !supportRow?.participant_id) {
        setLoadError("Your account isn't linked to a participant yet. Contact the study administrator.")
        return
      }

      // 2. Fetch the linked participant
      const { data: p, error: partErr } = await supabase
        .from("participants")
        .select("alias, support_code")
        .eq("id", supportRow.participant_id)
        .single()

      if (partErr || !p) {
        setLoadError("Could not load participant data. Please try again.")
        return
      }

      // 3. Fetch their activity in parallel
      const [weekly, stats] = await Promise.all([
        getWeeklyActivity(p.alias),
        getParticipantStats(p.alias),
      ])

      const wkTotal = weekly.reduce(
        (sum: number, d: { steps: number }) => sum + (d.steps || 0),
        0
      )

      setParticipant({
        alias: p.alias,
        supportCode: p.support_code,
        weeklyData: weekly,
        weeklyTotal: wkTotal,
        streak: stats.current_streak,
        points: stats.total_points,
      })
    } catch (err) {
      console.error("Error loading support dashboard:", err)
      setLoadError("Something went wrong. Please refresh and try again.")
    } finally {
      setLoading(false)
    }
  }, [user.alias])

  useEffect(() => {
    loadParticipant()
  }, [loadParticipant])

  // ── Send encouragement message ───────────────────────────────────────────
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || !participant) return

    setSending(true)
    setSendError("")
    try {
      const result = await sendSupportMessage(
        participant.supportCode,
        user.alias,
        message.trim()
      )
      if (!result) throw new Error("Send returned null")

      setMessage("")
      setSent(true)
      setTimeout(() => setSent(false), 2500)
    } catch (err) {
      console.error("Error sending message:", err)
      setSendError("Failed to send. Please try again.")
      setTimeout(() => setSendError(""), 3000)
    } finally {
      setSending(false)
    }
  }

  const level = getLevel(participant?.points ?? 0)
  const weeklyGoal = 35000
  const weeklyProgress = participant
    ? Math.min(Math.round((participant.weeklyTotal / weeklyGoal) * 100), 100)
    : 0

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 sm:space-y-5">

      {/* Header */}
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
        <p className="text-sm" style={{ color: "var(--text-dim)" }}>
          {loading
            ? "Loading your participant…"
            : participant
            ? `Viewing progress for ${participant.alias}`
            : "No linked participant"}
        </p>
      </motion.div>

      {/* Loading state */}
      {loading && (
        <motion.div
          custom={1} variants={card} initial="initial" animate="animate"
          className="glass-card rounded-2xl p-8 flex items-center justify-center"
        >
          <p className="text-sm" style={{ color: "var(--text-dim)" }}>Loading…</p>
        </motion.div>
      )}

      {/* Error state */}
      {!loading && loadError && (
        <motion.div
          custom={1} variants={card} initial="initial" animate="animate"
          className="glass-card rounded-2xl p-5 flex items-start gap-3"
          style={{ border: "1px solid rgba(248,113,113,0.2)" }}
        >
          <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" style={{ color: "#F87171" }} />
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{loadError}</p>
        </motion.div>
      )}

      {/* Main content — only shown when a participant is loaded */}
      <AnimatePresence>
        {!loading && participant && (
          <motion.div
            key={participant.alias}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-4"
          >

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
              {[
                {
                  icon: <BarChart3 className="h-4 w-4" />,
                  label: "Weekly",
                  val: participant.weeklyTotal.toLocaleString(),
                },
                {
                  icon: <Flame className="h-4 w-4" />,
                  label: "Streak",
                  val: `${participant.streak}d`,
                },
                {
                  icon: <Star className="h-4 w-4" />,
                  label: "Points",
                  val: `${participant.points}`,
                },
                {
                  icon: <Target className="h-4 w-4" />,
                  label: "Level",
                  val: level.name,
                },
              ].map((stat) => (
                <div key={stat.label} className="glass-card rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-1" style={{ color: "var(--text-muted)" }}>
                    {stat.icon}
                    <span className="text-xs">{stat.label}</span>
                  </div>
                  <p
                    className="font-[var(--font-montserrat)] text-xl font-light"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {stat.val}
                  </p>
                </div>
              ))}
            </div>

            {/* Weekly chart */}
            <div className="glass-card rounded-2xl p-4 sm:p-5">
              <h3
                className="text-xs font-medium mb-3"
                style={{ color: "var(--text-secondary)" }}
              >
                {"Weekly Steps for "}{participant.alias}
              </h3>
              <StepChart data={participant.weeklyData} animate={true} />
            </div>

            {/* Shared challenge progress */}
            <div
              className="glass-card rounded-2xl p-5"
              style={{ border: "1px solid rgba(14,165,164,0.15)" }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(14,165,164,0.15) 0%, rgba(6,182,212,0.1) 100%)",
                  }}
                >
                  <Target className="h-5 w-5" style={{ color: "#0EA5A4" }} />
                </div>
                <div>
                  <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                    Shared Weekly Challenge
                  </h3>
                  <p className="text-xs" style={{ color: "var(--text-dim)" }}>
                    Help {participant.alias} reach 35,000 steps
                  </p>
                </div>
              </div>
              <div
                className="h-2 rounded-full overflow-hidden"
                style={{ background: "var(--ring-track)" }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: "linear-gradient(90deg, #0EA5A4, #06B6D4)" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${weeklyProgress}%` }}
                  transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <p className="text-xs mt-1.5" style={{ color: "var(--text-dim)" }}>
                {weeklyProgress}% complete
                {weeklyProgress >= 100 && (
                  <span
                    className="ml-2 font-semibold"
                    style={{ color: "#10B981" }}
                  >
                    🎉 Goal reached!
                  </span>
                )}
              </p>
            </div>

            {/* Send encouragement */}
            <div className="glass-card rounded-2xl p-4 sm:p-5">
              <h3
                className="text-xs font-medium mb-3 flex items-center gap-2"
                style={{ color: "var(--text-secondary)" }}
              >
                <Send className="h-4 w-4" style={{ color: "#0EA5A4" }} />
                Send Encouragement
              </h3>
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={`Write a message for ${participant.alias}…`}
                  disabled={sending}
                  className="flex-1 rounded-xl px-4 py-2.5 text-sm transition-all duration-300 focus:outline-none disabled:opacity-50"
                  style={{ background: "var(--surface-input)", color: "var(--text-primary)" }}
                  onFocus={(e) => (e.currentTarget.style.boxShadow = "0 0 0 2px #0EA5A4")}
                  onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
                />
                <motion.button
                  type="submit"
                  disabled={sending || !message.trim()}
                  whileTap={{ scale: 0.97 }}
                  className="rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-300 flex items-center gap-1.5 disabled:opacity-50"
                  style={{
                    background: "linear-gradient(135deg, #0EA5A4 0%, #06B6D4 100%)",
                    color: "#0F172A",
                  }}
                >
                  <Send className="h-4 w-4" />
                  {sending ? "Sending…" : "Send"}
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
                    Message sent to {participant.alias}
                  </motion.p>
                )}
                {sendError && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="text-xs mt-2 flex items-center gap-1"
                    style={{ color: "#F87171" }}
                  >
                    <AlertCircle className="h-3 w-3" />
                    {sendError}
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
