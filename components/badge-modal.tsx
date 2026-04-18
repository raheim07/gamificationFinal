"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "@/lib/store"
import { X, Footprints, Calendar, Target, Flame, Zap, Star, Trophy, TrendingUp } from "lucide-react"
import { useEffect, useState } from "react"

const iconMap: Record<string, React.ReactNode> = {
  Footprints: <Footprints className="h-12 w-12" />,
  Calendar: <Calendar className="h-12 w-12" />,
  Target: <Target className="h-12 w-12" />,
  Flame: <Flame className="h-12 w-12" />,
  Zap: <Zap className="h-12 w-12" />,
  Star: <Star className="h-12 w-12" />,
  Trophy: <Trophy className="h-12 w-12" />,
  TrendingUp: <TrendingUp className="h-12 w-12" />,
}

const MICROCOPY: Record<string, string> = {
  "first-steps": "The journey begins with a single step.",
  "week-warrior": "Consistency is building real momentum.",
  "goal-crusher": "Cardiovascular resilience improving.",
  "streak-starter": "Habits are forming. Keep going.",
  "streak-master": "Discipline is your greatest ally.",
  "point-collector": "Sustained effort, measurable progress.",
  "champion": "Elite commitment to your health.",
  "ten-k-day": "Extraordinary effort, extraordinary results.",
}

interface BadgeModalProps {
  badge: Badge | null
  onClose: () => void
}

function ConfettiPiece({ index }: { index: number }) {
  const colors = ["#0EA5A4", "#06B6D4", "#FACC15", "#F97316", "#10B981", "#8B5CF6", "#EC4899"]
  const color = colors[index % colors.length]
  const x = (Math.random() - 0.5) * 260
  const rotation = Math.random() * 540
  const scale = 0.5 + Math.random() * 0.8
  const delay = index * 0.025

  return (
    <motion.div
      initial={{ opacity: 1, y: 0, x: 0, rotate: 0, scale }}
      animate={{ opacity: 0, y: 180 + Math.random() * 60, x, rotate: rotation, scale: 0 }}
      transition={{ duration: 1.4 + Math.random() * 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      className="absolute top-0 left-1/2"
      style={{
        width: Math.random() > 0.5 ? 6 : 4,
        height: Math.random() > 0.5 ? 6 : 10,
        background: color,
        borderRadius: Math.random() > 0.5 ? "50%" : "1px",
      }}
    />
  )
}

export function BadgeModal({ badge, onClose }: BadgeModalProps) {
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    if (badge) {
      const timer = setTimeout(() => setShowConfetti(true), 200)
      return () => clearTimeout(timer)
    }
    setShowConfetti(false)
  }, [badge])

  return (
    <AnimatePresence>
      {badge && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0, 0, 0, 0.7)", backdropFilter: "blur(8px)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 10 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="glass-card rounded-2xl sm:rounded-3xl p-6 sm:p-10 text-center max-w-sm w-full relative overflow-hidden mx-4"
            style={{ borderColor: "rgba(250, 204, 21, 0.15)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Radial glow */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "radial-gradient(circle at 50% 30%, rgba(250, 204, 21, 0.06) 0%, transparent 60%)",
              }}
            />

            {/* Confetti */}
            {showConfetti && (
              <div className="absolute inset-0 pointer-events-none flex items-start justify-center overflow-hidden">
                {Array.from({ length: 36 }).map((_, i) => (
                  <ConfettiPiece key={i} index={i} />
                ))}
              </div>
            )}

            <button
              onClick={onClose}
              className="absolute top-4 right-4 hover:opacity-80 transition-opacity"
              style={{ color: "var(--text-muted)" }}
              aria-label="Close badge modal"
            >
              <X className="h-5 w-5" />
            </button>

            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl mb-4 sm:mb-5 badge-shimmer relative"
              style={{
                background: "linear-gradient(135deg, rgba(250, 204, 21, 0.15) 0%, rgba(249, 115, 22, 0.1) 100%)",
                color: "#FACC15",
                boxShadow: "0 0 30px -8px rgba(250, 204, 21, 0.2)",
              }}
            >
              {iconMap[badge.icon] || <Star className="h-12 w-12" />}
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="text-xs uppercase tracking-[0.2em] font-medium mb-3"
              style={{ color: "var(--text-muted)" }}
            >
              Achievement Unlocked
            </motion.p>

            <motion.h2
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.4 }}
              className="font-[var(--font-montserrat)] text-xl sm:text-2xl font-bold mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              {badge.name}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              className="text-sm mb-4"
              style={{ color: "var(--text-muted)" }}
            >
              {badge.description}
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="text-xs italic"
              style={{ color: "#0EA5A4" }}
            >
              {MICROCOPY[badge.id] || "Progress is its own reward."}
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
