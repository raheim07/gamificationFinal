"use client"

import { motion } from "framer-motion"
import { Heart, Activity, Users, ShieldCheck, Moon, Sun } from "lucide-react"
import { useTheme } from "@/hooks/use-theme"

type EntryChoice = "participant" | "participant-login" | "support" | "admin"

interface EntryScreenProps {
  onSelect: (choice: EntryChoice) => void
}

const stagger = {
  animate: { transition: { staggerChildren: 0.1 } },
}

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
}

export function EntryScreen({ onSelect }: EntryScreenProps) {
  const { theme, toggleTheme } = useTheme()

  const options: { value: EntryChoice; label: string; icon: React.ReactNode; desc: string }[] = [
    { value: "participant", label: "Participant Registration", icon: <Activity className="h-6 w-6" />, desc: "Track your steps and earn rewards" },
    { value: "participant-login", label: "Participant Login", icon: <Activity className="h-6 w-6" />, desc: "Motivation is what gets you started. Habit is what keeps you going" },
    { value: "support", label: "Join as Support", icon: <Users className="h-6 w-6" />, desc: "Encourage and support participants" },
    { value: "admin", label: "Admin Login", icon: <ShieldCheck className="h-6 w-6" />, desc: "View study analytics and data" },
  ]

  return (
    <div className="gradient-bg min-h-screen flex items-center justify-center px-4 py-8 sm:p-4">
      {/* Bottom theme toggle */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center z-50">
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl transition-all duration-300 hover:scale-105"
          style={{ 
            color: "var(--text-dim)",
            background: "var(--surface-card)",
            border: "1px solid var(--border-subtle)",
          }}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      </div>

      {/* Floating particles - hidden on mobile for performance */}
      <div className="pointer-events-none hidden sm:block" aria-hidden>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="particle" />
        ))}
      </div>

      <motion.div
        variants={stagger}
        initial="initial"
        animate="animate"
        className="w-full max-w-md relative z-10 px-2 sm:px-0"
      >
        {/* Logo / Hero */}
        <motion.div variants={fadeUp} className="text-center mb-6 sm:mb-10">
          <motion.div
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
            style={{
              background: "var(--brand-tint-bg)",
              boxShadow: "0 0 40px -8px var(--brand-glow)",
            }}
          >
            <Heart className="h-8 w-8" style={{ color: "var(--brand-primary)" }} />
          </motion.div>
          <h1
            className="text-xl sm:text-2xl font-extrabold tracking-wide text-balance"
            style={{ color: "var(--text-primary)" }}
          >
            Gamified Physical Activity
          </h1>
          <h2
            className="text-xl sm:text-2xl font-extrabold tracking-wide"
            style={{ color: "var(--text-primary)" }}
          >
            
          </h2>
          <p className="mt-3 text-sm tracking-wide" style={{ color: "var(--text-muted)" }}>
            Cardiovascular Risk Reduction Study
          </p>
        </motion.div>

        {/* Entry options */}
        <motion.div variants={fadeUp} className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-3">
          {options.map((option) => (
            <motion.button
              key={option.value}
              type="button"
              onClick={() => onSelect(option.value)}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center gap-3 sm:gap-4 rounded-xl px-4 sm:px-5 py-4 min-h-[64px] transition-all duration-300 text-left group"
              style={{
                background: "var(--surface-subtle)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <span 
                className="flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-300"
                style={{ 
                  background: "var(--surface-selected)", 
                  color: "var(--brand-primary)",
                }}
              >
                {option.icon}
              </span>
              <div className="flex-1">
                <span className="font-semibold text-base block" style={{ color: "var(--text-primary)" }}>
                  {option.label}
                </span>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {option.desc}
                </p>
              </div>
            </motion.button>
          ))}
        </motion.div>
      </motion.div>
    </div>
  )
}
