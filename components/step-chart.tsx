"use client"

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from "recharts"
import { StepEntry } from "@/lib/store"

interface StepChartProps {
  data: StepEntry[]
  animate?: boolean
}

const COLORS = ["#0EA5A4", "#06B6D4", "#38BDF8"]
const GOAL = 5000

// Parses "YYYY-MM-DD" as a LOCAL date (not UTC).
// Using new Date("YYYY-MM-DD") treats it as UTC midnight which rolls
// back one day in negative-offset timezones (US, etc.) — this fixes that.
function parseDateLocal(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number)
  return new Date(year, month - 1, day)
}

export function StepChart({ data, animate = true }: StepChartProps) {
  // Also get today using local date parts so the comparison is always correct
  const now = new Date()
  const today = now.toLocaleDateString("en", { weekday: "short" })

  const maxSteps = Math.max(...data.map((d) => d.steps), 0)

  const chartData = data.map((entry, i) => {
    const day = parseDateLocal(entry.date).toLocaleDateString("en", { weekday: "short" })
    return {
      day,
      steps: entry.steps,
      isToday: day === today,
      reachedGoal: entry.steps >= GOAL,
      isMax: entry.steps === maxSteps && entry.steps > 0,
      colorIndex: i % COLORS.length,
    }
  })

  return (
    <div className="h-[160px] sm:h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <defs>
            <linearGradient id="barGradient0" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0EA5A4" stopOpacity={1} />
              <stop offset="100%" stopColor="#0EA5A4" stopOpacity={0.7} />
            </linearGradient>
            <linearGradient id="barGradient1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06B6D4" stopOpacity={1} />
              <stop offset="100%" stopColor="#06B6D4" stopOpacity={0.7} />
            </linearGradient>
            <linearGradient id="barGradient2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity={1} />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity={0.7} />
            </linearGradient>
            <linearGradient id="barGradientSuccess" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity={1} />
              <stop offset="100%" stopColor="#10B981" stopOpacity={0.7} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--grid-stroke)"
            vertical={false}
          />
          <XAxis
            dataKey="day"
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            ticks={[0, 2000, 4000, 6000, 8000, 10000, 12000]}
            domain={[0, (dataMax: number) => Math.max(12000, Math.ceil(dataMax / 2000) * 2000)]}
            tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)}
          />
          <ReferenceLine
            y={GOAL}
            stroke="var(--brand-primary)"
            strokeDasharray="6 4"
            strokeOpacity={0.3}
            label={{
              value: "5K Goal",
              position: "insideTopRight",
              fill: "var(--text-dim)",
              fontSize: 10,
            }}
          />
          <Tooltip
            contentStyle={{
              background: "var(--chart-tooltip-bg)",
              border: "1px solid var(--chart-tooltip-border)",
              borderRadius: "12px",
              backdropFilter: "blur(12px)",
              color: "var(--text-primary)",
              boxShadow: "var(--chart-tooltip-shadow)",
            }}
            labelStyle={{ color: "var(--text-muted)", fontSize: 12 }}
            itemStyle={{ color: "var(--brand-primary)" }}
            cursor={{ fill: "var(--chart-cursor)" }}
            formatter={(value: number) => [`${value.toLocaleString()} steps`, ""]}
          />
          <Bar
            dataKey="steps"
            radius={[6, 6, 0, 0]}
            isAnimationActive={animate}
            animationDuration={800}
            animationEasing="ease-out"
          >
            {chartData.map((entry, index) => {
              let fill = `url(#barGradient${entry.colorIndex})`
              let opacity = 1

              if (entry.reachedGoal) fill = "url(#barGradientSuccess)"
              if (entry.steps < 2000 && entry.steps > 0) opacity = 0.55

              return (
                <Cell
                  key={`cell-${index}`}
                  fill={fill}
                  opacity={opacity}
                  stroke={entry.isToday ? "var(--brand-primary)" : "transparent"}
                  strokeWidth={entry.isToday ? 2 : 0}
                />
              )
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
