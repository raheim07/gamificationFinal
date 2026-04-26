"use client"

import { useState, useEffect, useCallback } from "react"
import { User } from "@/lib/store"
import { StepChart } from "@/components/step-chart"
import { Footprints, BarChart3, TrendingUp } from "lucide-react"
import {
  saveDailySteps,
  getWeeklyActivity,
  getParticipantStats,
  getTodaySteps,
} from "@/src/services/activityService"

interface ControlDashboardProps {
  user: User
}

export function ControlDashboard({ user }: ControlDashboardProps) {
  const [stepInput, setStepInput] = useState("")
  const [weeklyData, setWeeklyData] = useState<{ date: string; steps: number }[]>([])
  const [weeklyTotal, setWeeklyTotal] = useState(0)
  const [adherence, setAdherence] = useState(0)
  const [todaySteps, setTodaySteps] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [weekly, stats, today] = await Promise.all([
        getWeeklyActivity(user.alias),
        getParticipantStats(user.alias),
        getTodaySteps(user.alias),
      ])

      setWeeklyData(weekly)
      setWeeklyTotal(stats.total_steps)
      setAdherence(stats.adherence)
      setTodaySteps(today)
    } catch (err) {
      console.error("Error loading control dashboard data:", err)
    } finally {
      setLoading(false)
    }
  }, [user.alias])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const steps = parseInt(stepInput)
    if (isNaN(steps) || steps <= 0) return

    setSubmitting(true)
    try {
      await saveDailySteps(user.alias, steps)
      setStepInput("")
      await loadData()
    } catch (err) {
      console.error("Error submitting steps:", err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Clean header - no animations, no energy */}
      <div>
        <h2
          className="font-[var(--font-montserrat)] text-lg font-bold tracking-wide"
          style={{ color: "var(--text-primary)" }}
        >
          Step Tracker
        </h2>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-dim)" }}>Log your steps for the day</p>
      </div>

      {/* Step Input - static, clean */}
      <div className="glass-card rounded-2xl p-4 sm:p-5">
        <h3 className="text-xs font-medium mb-3 flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
          <Footprints className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
          Log Steps
        </h3>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="number"
            value={stepInput}
            onChange={(e) => setStepInput(e.target.value)}
            placeholder="Enter steps..."
            min="1"
            disabled={submitting}
            className="flex-1 rounded-xl px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 disabled:opacity-50"
            style={{
              background: "var(--surface-input)",
              color: "var(--text-primary)",
            }}
            onFocus={(e) => (e.currentTarget.style.boxShadow = "0 0 0 2px var(--text-dim)")}
            onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
          />
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: "var(--surface-tag)", color: "var(--text-secondary)" }}
          >
            {submitting ? "Saving..." : "Submit"}
          </button>
        </form>
        {todaySteps > 0 && (
          <p className="text-xs mt-2" style={{ color: "var(--text-dim)" }}>
            {"Today's total: "}
            {todaySteps.toLocaleString()} steps
          </p>
        )}
      </div>

      {/* Stats - flat, no glow */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card rounded-2xl p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-1" style={{ color: "var(--text-muted)" }}>
            <BarChart3 className="h-4 w-4" />
            <span className="text-xs">Weekly Total</span>
          </div>
          <p
            className="font-[var(--font-montserrat)] text-2xl font-light"
            style={{ color: "var(--text-primary)" }}
          >
            {loading ? "—" : weeklyTotal.toLocaleString()}
          </p>
        </div>
        <div className="glass-card rounded-2xl p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-1" style={{ color: "var(--text-muted)" }}>
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs">Adherence</span>
          </div>
          <p
            className="font-[var(--font-montserrat)] text-2xl font-light"
            style={{ color: "var(--text-primary)" }}
          >
            {loading ? "—" : `${adherence}%`}
          </p>
        </div>
      </div>

      {/* Chart - no animation, static */}
      <div className="glass-card rounded-2xl p-4 sm:p-5">
        <h3 className="text-xs font-medium mb-3" style={{ color: "var(--text-secondary)" }}>
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
          <StepChart data={weeklyData} animate={false} />
        )}
      </div>
    </div>
  )
}
