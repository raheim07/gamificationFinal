"use client"

import { useEffect, useState, useRef } from "react"
import { motion } from "framer-motion"

interface AnimatedCounterProps {
  value: number
  duration?: number
  label: string
  suffix?: string
  icon?: React.ReactNode
}

export function AnimatedCounter({ value, duration = 1.5, label, suffix = "", icon }: AnimatedCounterProps) {
  const [display, setDisplay] = useState(0)
  const prevValue = useRef(0)

  useEffect(() => {
    const start = prevValue.current
    const end = value
    const startTime = Date.now()
    const totalDuration = duration * 1000

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / totalDuration, 1)
      // cubic-bezier easing
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(start + (end - start) * eased))

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        prevValue.current = end
      }
    }

    requestAnimationFrame(animate)
  }, [value, duration])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="glass-card rounded-2xl p-3 sm:p-4 text-center ambient-glow"
    >
      {icon && (
        <div className="mb-2 flex justify-center" style={{ color: "#0EA5A4" }}>
          {icon}
        </div>
      )}
      <div
        className="font-[var(--font-montserrat)] text-lg sm:text-2xl font-light tracking-tight"
        style={{ color: "var(--text-primary)" }}
      >
        {display.toLocaleString()}{suffix}
      </div>
      <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{label}</div>
    </motion.div>
  )
}
