"use client"

import { motion } from "framer-motion"

interface ProgressRingProps {
  progress: number
  size?: number
  strokeWidth?: number
  label?: string
  value?: string
  goalReached?: boolean
}

export function ProgressRing({ progress, size = 120, strokeWidth = 8, label, value, goalReached = false }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (Math.min(progress, 100) / 100) * circumference

  const strokeColor = goalReached ? "url(#emeraldGrad)" : "url(#tealGrad)"

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Ambient glow behind ring */}
        <div
          className="absolute inset-0 rounded-full blur-xl opacity-30"
          style={{
            background: goalReached
              ? "radial-gradient(circle, #10B981 0%, transparent 70%)"
              : "radial-gradient(circle, #0EA5A4 0%, transparent 70%)",
          }}
        />
        <svg width={size} height={size} className="-rotate-90 relative">
          <defs>
            <linearGradient id="tealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0EA5A4" />
              <stop offset="100%" stopColor="#06B6D4" />
            </linearGradient>
            <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#06B6D4" />
            </linearGradient>
          </defs>
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--ring-track)"
            strokeWidth={strokeWidth}
          />
          {/* Progress */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={circumference}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-[var(--font-montserrat)] text-xl font-light tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            {value || `${Math.round(progress)}%`}
          </span>
        </div>
      </div>
      {label && <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{label}</span>}
    </div>
  )
}
