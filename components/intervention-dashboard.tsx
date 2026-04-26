"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { User, Badge, getLevel, BADGES } from "@/lib/store"
import { StepChart } from "@/components/step-chart"
import { ProgressRing } from "@/components/progress-ring"
import { AnimatedCounter } from "@/components/animated-counter"
import { BadgeModal } from "@/components/badge-modal"
import {
  Footprints, Flame, Star, Trophy, Target,
  Medal, MessageCircle, Zap, TrendingUp, Calendar,
  ChevronUp,
} from "lucide-react"
import {
  saveDailySteps,
  getWeeklyActivity,
  getParticipantStats,
  getTodaySteps,
} from "@/src/services/activityService"
import { getInterventionLeaderboard } from "@/src/services/participantService"
import { getMessagesForParticipant } from "@/src/services/messageService"

// ---------------------------------------------------------------------------
// Badge derivation — computed from stats, no DB table needed
// ---------------------------------------------------------------------------
function deriveBadgesFromStats(
  stats: { total_steps: number; current_streak: number; adherence: number; total_points: number },
  weeklyTotal: number
): Badge[] {
  const unlocked: Badge[] = []

  for (const badge of BADGES) {
    let earned = false

    switch (badge.id) {
      // Adjust these conditions to match whatever your BADGES array uses
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
        earned = stats.total_steps >= 10000
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
        // Fallback: badge unlocks at 100 points per badge index
        earned = stats.total_points >= (BADGES.indexOf(badge) + 1) * 100
    }

    if (earned) unlocked.push(badge)
  }

  return unlocked
}

// ---------------------------------------------------------------------------
// Icon map
// ---------------------------------------------------------------------------
const smallIconMap: Record<string, React.ReactNode> = {
  Footprints: <Footprints className="h-5 w-5" />,
  Calendar: <Calendar className="h-5 w-5" />,
  Target: <Target className="h-5 w-5" />,
  Flame: <Flame className="h-5 w-5" />,
  Zap: <Zap className="h-5 w-5" />,
  Star: <Star className="h-5 w-5" />,
  Trophy: <Trophy className="h-5 w-5" />,
  TrendingUp: <TrendingUp className="h-5 w-5" />,
}

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------
const card = {
  initial: { opacity: 0, y: 20 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
}

// ---------------------------------------------------------------------------
// Micro-interaction components
// ---------------------------------------------------------------------------
function Sparks() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2
        const x = Math.cos(angle) * 30
        const y = Math.sin(angle) * 30
        return (
          <motion.div
            key={i}
            initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            animate={{ opacity: 0, x, y, scale: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute top-1/2 left-1/2 w-1 h-1 rounded-full"
            style={{ background: "#0EA5A4" }}
          />
        )
      })}
    </div>
  )
}

function PointsFloat({ points }: { points: number }) {
  return (
    <motion.div
      initial={{ opacity: 1, y: 0 }}
      animate={{ opacity: 0, y: -40 }}
      transition={{ duration: 1.2, ease: "easeOut" }}
      className="absolute -top-2 right-4 text-sm font-bold pointer-events-none"
      style={{ color: "#0EA5A4" }}
    >
      +{points} pts
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface InterventionDashboardProps {
  user: User
  introPlayed?: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function InterventionDashboard({ user, introPlayed }: InterventionDashboardProps) {
  const [stepInput, setStepInput] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Data state
  const [weeklyData, setWeeklyData] = useState<{ date: string; steps: number }[]>([])
  const [weeklyTotal, setWeeklyTotal] = useState(0)
  const [adherence, setAdherence] = useState(0)
  const [points, setPoints] = useState(0)
  const [streak, setStreak] = useState(0)
  const [todaySteps, setTodaySteps] = useState(0)
  const [unlockedBadges, setUnlockedBadges] = useState<Badge[]>([])
  const [leaderboard, setLeaderboard] = useState<{ alias: string; points: number }[]>([])
  const [messages, setMessages] = useState<{ id: string; from: string; text: string }[]>([])

  // Micro-interaction state
  const [newBadge, setNewBadge] = useState<Badge | null>(null)
  const [showSparks, setShowSparks] = useState(false)
  const [pointsEarned, setPointsEarned] = useState<number | null>(null)
  const [submitPulse, setSubmitPulse] = useState(false)
  const submitKey = useRef(0)

  // ---------------------------------------------------------------------------
  // Data loader
  // ---------------------------------------------------------------------------
  const loadData = useCallback(async () => {
    try {
      const [weekly, stats, today, board, msgs] = await Promise.all([
        getWeeklyActivity(user.alias),
        getParticipantStats(user.alias),
        getTodaySteps(user.alias),
        getInterventionLeaderboard(),
        getMessagesForParticipant(user.alias),
      ])

      const wkTotal = weekly.reduce((sum: any, d: { steps: any }) => sum + (d.steps || 0), 0)

      setWeeklyData(weekly)
      setWeeklyTotal(wkTotal)
      setAdherence(stats.adherence)
      setPoints(stats.total_points)
      setStreak(stats.current_streak)
      setTodaySteps(today)
      setUnlockedBadges(deriveBadgesFromStats(stats, wkTotal))
      setLeaderboard(board)
      setMessages(msgs)
    } catch (err) {
      console.error("Error loading intervention dashboard:", err)
    } finally {
      setLoading(false)
    }
  }, [user.alias])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ---------------------------------------------------------------------------
  // Step submission
  // ---------------------------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const steps = parseInt(stepInput)
    if (isNaN(steps) || steps <= 0) return

    const prevPoints = points
    setSubmitting(true)

    try {
      await saveDailySteps(user.alias, steps)

      // Refresh all data after save
      const [weekly, stats, today, board] = await Promise.all([
        getWeeklyActivity(user.alias),
        getParticipantStats(user.alias),
        getTodaySteps(user.alias),
        getInterventionLeaderboard(),
      ])

      const wkTotal = weekly.reduce((sum: any, d: { steps: any }) => sum + (d.steps || 0), 0)
      const newBadges = deriveBadgesFromStats(stats, wkTotal)
      const earned = stats.total_points - prevPoints

      setWeeklyData(weekly)
      setWeeklyTotal(wkTotal)
      setAdherence(stats.adherence)
      setPoints(stats.total_points)
      setStreak(stats.current_streak)
      setTodaySteps(today)
      setLeaderboard(board)

      // Detect newly unlocked badges
      const previouslyUnlocked = new Set(unlockedBadges.map((b) => b.id))
      const freshlyUnlocked = newBadges.filter((b) => !previouslyUnlocked.has(b.id))
      setUnlockedBadges(newBadges)
      if (freshlyUnlocked.length > 0) setNewBadge(freshlyUnlocked[0])

      // Micro-interactions
      setSubmitPulse(true)
      setTimeout(() => setSubmitPulse(false), 400)

      setShowSparks(true)
      submitKey.current++
      setTimeout(() => setShowSparks(false), 800)

      if (earned > 0) {
        setPointsEarned(earned)
        setTimeout(() => setPointsEarned(null), 1200)
      }

      setStepInput("")
    } catch (err) {
      console.error("Error submitting steps:", err)
    } finally {
      setSubmitting(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Derived display values
  // ---------------------------------------------------------------------------
  const level = getLevel(points)
  const weeklyGoal = 35000
  const weeklyProgress = Math.round((weeklyTotal / weeklyGoal) * 100)
  const goalReached = weeklyTotal >= weeklyGoal

  const microcopies = [
    "Every step builds cardiovascular resilience.",
    "Consistency compounds into lasting health.",
    "Your movement today shapes your wellbeing tomorrow.",
    "Purposeful motion, measurable progress.",
    "Small steps, profound impact.",
  ]
  const motivationalText = microcopies[Math.floor(Date.now() / 86400000) % microcopies.length]

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Welcome */}
      <motion.div custom={0} variants={card} initial="initial" animate="animate">
        <div className="flex items-center gap-2 mb-1">
          <h2
            className="font-[var(--font-montserrat)] text-lg font-bold tracking-wide"
            style={{ color: "var(--text-primary)" }}
          >
            Welcome back, {user.alias}
          </h2>
          <motion.div
            animate={{
              scale: [1, 1.15, 1],
              filter: streak > 0
                ? [
                    "drop-shadow(0 0 4px rgba(249,115,22,0.3))",
                    "drop-shadow(0 0 8px rgba(249,115,22,0.5))",
                    "drop-shadow(0 0 4px rgba(249,115,22,0.3))",
                  ]
                : undefined,
            }}
            transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
          >
            <Flame
              className="h-5 w-5"
              style={{ color: streak > 0 ? "#F97316" : "var(--text-dim)" }}
            />
          </motion.div>
        </div>
        <p className="text-sm italic" style={{ color: "var(--text-dim)" }}>
          {motivationalText}
        </p>
      </motion.div>

      {/* Step Input */}
      <motion.div
        custom={1}
        variants={card}
        initial="initial"
        animate="animate"
        className="glass-card rounded-2xl p-4 sm:p-5 ambient-glow relative"
      >
        <h3
          className="text-xs font-medium mb-3 flex items-center gap-2"
          style={{ color: "var(--text-secondary)" }}
        >
          <Footprints className="h-4 w-4" style={{ color: "#0EA5A4" }} />
          Log Your Steps
        </h3>
        <form onSubmit={handleSubmit} className="flex gap-2 relative">
          <input
            type="number"
            value={stepInput}
            onChange={(e) => setStepInput(e.target.value)}
            placeholder="Enter steps..."
            min="1"
            disabled={submitting}
            className="flex-1 rounded-xl px-4 py-2.5 text-sm transition-all duration-300 focus:outline-none disabled:opacity-50"
            style={{ background: "var(--surface-input)", color: "var(--text-primary)" }}
            onFocus={(e) =>
              (e.currentTarget.style.boxShadow =
                "0 0 0 2px #0EA5A4, 0 0 12px -4px rgba(14,165,164,0.2)")
            }
            onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
          />
          <motion.button
            type="submit"
            disabled={submitting}
            animate={submitPulse ? { scale: [1, 1.06, 1] } : {}}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-300 relative overflow-hidden disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #0EA5A4 0%, #06B6D4 100%)",
              color: "#0F172A",
              boxShadow: "0 2px 12px -2px rgba(14,165,164,0.3)",
            }}
          >
            {submitting ? "Saving..." : "Log"}
            {showSparks && <Sparks key={submitKey.current} />}
          </motion.button>
        </form>

        <AnimatePresence>
          {pointsEarned !== null && (
            <PointsFloat key={submitKey.current} points={pointsEarned} />
          )}
        </AnimatePresence>

        {todaySteps > 0 && (
          <div className="flex items-center gap-1.5 mt-2">
            <ChevronUp className="h-3 w-3" style={{ color: "#0EA5A4" }} />
            <p className="text-xs" style={{ color: "var(--text-dim)" }}>
              {"Today: "}
              {todaySteps.toLocaleString()} steps
            </p>
          </div>
        )}
      </motion.div>

      {/* Animated Stats Row */}
      <motion.div
        custom={2}
        variants={card}
        initial="initial"
        animate="animate"
        className="grid grid-cols-3 gap-2 sm:gap-3"
      >
        <AnimatedCounter value={points} label="Points" icon={<Star className="h-5 w-5" />} />
        <AnimatedCounter
          value={streak}
          label="Day Streak"
          suffix="d"
          icon={<Flame className="h-5 w-5" />}
        />
        <AnimatedCounter
          value={adherence}
          label="Adherence"
          suffix="%"
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </motion.div>

      {/* Level & Weekly Goal */}
      <motion.div
        custom={3}
        variants={card}
        initial="initial"
        animate="animate"
        className={`glass-card rounded-2xl p-4 sm:p-5 ambient-glow ${goalReached ? "goal-burst" : ""}`}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <span
              className="text-xs uppercase tracking-wider"
              style={{ color: "var(--text-dim)" }}
            >
              Current Level
            </span>
            <div className="flex items-center gap-2 mt-1">
              <Medal className="h-5 w-5" style={{ color: "#0EA5A4" }} />
              <span
                className="font-[var(--font-montserrat)] text-lg font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                {level.name}
              </span>
            </div>
            <div
              className="mt-2 w-32 h-1.5 rounded-full overflow-hidden"
              style={{ background: "var(--ring-track)" }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, #0EA5A4, #06B6D4)" }}
                initial={{ width: 0 }}
                animate={{
                  width: `${Math.min(
                    ((points - level.min) / (level.max - level.min)) * 100,
                    100
                  )}%`,
                }}
                transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
          <div className="hidden sm:block">
            <ProgressRing
              progress={weeklyProgress}
              size={100}
              strokeWidth={8}
              value={`${Math.min(Math.round(weeklyProgress), 100)}%`}
              label="Weekly Goal"
              goalReached={goalReached}
            />
          </div>
          <div className="sm:hidden">
            <ProgressRing
              progress={weeklyProgress}
              size={80}
              strokeWidth={6}
              value={`${Math.min(Math.round(weeklyProgress), 100)}%`}
              label="Weekly Goal"
              goalReached={goalReached}
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: "var(--text-dim)" }}>
            {weeklyTotal.toLocaleString()} / {weeklyGoal.toLocaleString()} steps this week
          </p>
          {goalReached && (
            <motion.span
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="text-[10px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full"
              style={{ background: "rgba(16,185,129,0.12)", color: "#10B981" }}
            >
              Goal Achieved
            </motion.span>
          )}
        </div>
      </motion.div>

      {/* Chart */}
      <motion.div
        custom={4}
        variants={card}
        initial="initial"
        animate="animate"
        className="glass-card rounded-2xl p-4 sm:p-5"
      >
        <h3
          className="text-xs font-medium mb-3"
          style={{ color: "var(--text-secondary)" }}
        >
          Weekly Breakdown
        </h3>
        {loading ? (
          <div
            className="h-32 flex items-center justify-center text-xs"
            style={{ color: "var(--text-dim)" }}
          >
            Loading...
          </div>
        ) : (
          <StepChart data={weeklyData} animate={true} />
        )}
      </motion.div>

      {/* Challenge Card */}
      <motion.div
        custom={5}
        variants={card}
        initial="initial"
        animate="animate"
        className="glass-card rounded-2xl p-4 sm:p-5"
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
              Weekly Challenge
            </h3>
            <p className="text-xs" style={{ color: "var(--text-dim)" }}>
              Reach 35,000 steps this week
            </p>
          </div>
        </div>
        <div
          className="h-2 rounded-full overflow-hidden"
          style={{ background: "var(--ring-track)" }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{
              background: goalReached
                ? "linear-gradient(90deg, #10B981, #06B6D4)"
                : "linear-gradient(90deg, #0EA5A4, #06B6D4)",
            }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(weeklyProgress, 100)}%` }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
        <p className="text-xs mt-1.5" style={{ color: "var(--text-dim)" }}>
          {goalReached
            ? "Cardiovascular resilience improving."
            : `${Math.max(0, weeklyGoal - weeklyTotal).toLocaleString()} steps remaining`}
        </p>
      </motion.div>

      {/* Badges */}
      <motion.div
        custom={6}
        variants={card}
        initial="initial"
        animate="animate"
        className="glass-card rounded-2xl p-4 sm:p-5"
      >
        <h3
          className="text-xs font-medium mb-3 flex items-center gap-2"
          style={{ color: "var(--text-secondary)" }}
        >
          <Trophy className="h-4 w-4" style={{ color: "#0EA5A4" }} />
          Badges ({unlockedBadges.length}/{BADGES.length})
        </h3>
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {BADGES.map((badge) => {
            const isUnlocked = unlockedBadges.some((b) => b.id === badge.id)
            return (
              <motion.div
                key={badge.id}
                whileHover={isUnlocked ? { scale: 1.05, y: -2 } : {}}
                className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all duration-300 relative ${
                  isUnlocked ? "badge-shimmer" : ""
                }`}
                style={{
                  background: isUnlocked
                    ? "linear-gradient(135deg, rgba(250,204,21,0.08) 0%, rgba(249,115,22,0.06) 100%)"
                    : "var(--badge-locked-bg)",
                  color: isUnlocked ? "#FACC15" : "var(--text-faint)",
                  opacity: isUnlocked ? 1 : 0.35,
                  border: isUnlocked
                    ? "1px solid rgba(250,204,21,0.1)"
                    : "1px solid transparent",
                }}
              >
                {smallIconMap[badge.icon] || <Star className="h-5 w-5" />}
                <span className="text-[10px] text-center leading-tight font-medium">
                  {badge.name}
                </span>
              </motion.div>
            )
          })}
        </div>
      </motion.div>

      {/* Leaderboard */}
      <motion.div
        custom={7}
        variants={card}
        initial="initial"
        animate="animate"
        className="glass-card rounded-2xl p-4 sm:p-5"
      >
        <h3
          className="text-xs font-medium mb-3 flex items-center gap-2"
          style={{ color: "var(--text-secondary)" }}
        >
          <Trophy className="h-4 w-4" style={{ color: "#0EA5A4" }} />
          Leaderboard
        </h3>
        {loading ? (
          <p className="text-sm" style={{ color: "var(--text-dim)" }}>
            Loading...
          </p>
        ) : leaderboard.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            No participants yet
          </p>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((entry, idx) => {
              const isYou = entry.alias === user.alias
              const isFirst = idx === 0
              return (
                <motion.div
                  key={entry.alias}
                  whileHover={{ y: -2, boxShadow: "0 6px 24px -4px rgba(0,0,0,0.3)" }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                    isFirst ? "gold-glow" : ""
                  }`}
                  style={{
                    background: isYou ? "rgba(14,165,164,0.08)" : "var(--surface-card)",
                    backdropFilter: "blur(8px)",
                    border: isFirst ? undefined : "1px solid rgba(148,163,184,0.04)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="font-[var(--font-montserrat)] text-lg font-light w-8"
                      style={{ color: isFirst ? "#FACC15" : "var(--text-dim)" }}
                    >
                      {idx + 1}
                    </span>
                    <span
                      className="text-sm font-medium"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {entry.alias}
                      {isYou ? " (You)" : ""}
                    </span>
                  </div>
                  <span className="text-sm font-semibold" style={{ color: "#0EA5A4" }}>
                    {entry.points} pts
                  </span>
                </motion.div>
              )
            })}
          </div>
        )}
      </motion.div>

      {/* Support Messages */}
      {messages.length > 0 && (
        <motion.div
          custom={8}
          variants={card}
          initial="initial"
          animate="animate"
          className="glass-card rounded-2xl p-4 sm:p-5"
        >
          <h3
            className="text-xs font-medium mb-3 flex items-center gap-2"
            style={{ color: "var(--text-secondary)" }}
          >
            <MessageCircle className="h-4 w-4" style={{ color: "#0EA5A4" }} />
            Encouragement Feed
          </h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className="rounded-xl px-3 py-2.5"
                style={{
                  background: "var(--surface-subtle)",
                  border: "1px solid var(--border-faint)",
                }}
              >
                <p className="text-[11px] mb-0.5" style={{ color: "var(--text-dim)" }}>
                  From {msg.from}
                </p>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {msg.text}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Badge Modal */}
      <BadgeModal badge={newBadge} onClose={() => setNewBadge(null)} />
    </div>
  )
}
