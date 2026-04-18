"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Heart, ArrowLeft, ShieldCheck, Moon, Sun } from "lucide-react"
import { useTheme } from "@/hooks/use-theme"
import { User, saveUser, setCurrentUser } from "@/lib/store"

interface AdminLoginProps {
  onComplete: (user: User) => void
  onBack: () => void
}

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
}

export function AdminLogin({ onComplete, onBack }: AdminLoginProps) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const { theme, toggleTheme } = useTheme()

  const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD

  const handleSubmit = () => {
    if (!password.trim()) {
      setError("Please enter the admin password")
      return
    }

    if (password !== ADMIN_PASSWORD) {
      setError("Incorrect password")
      return
    }

    const user: User = {
      alias: "Admin",
      role: "admin",
      createdAt: new Date().toISOString(),
    }

    saveUser(user)
    setCurrentUser(user)
    localStorage.setItem("user", JSON.stringify(user))

    onComplete(user)
  }

  return (
    <div className="gradient-bg min-h-screen flex items-center justify-center px-4 py-8 sm:p-4">
      {/* Bottom navigation bar */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center items-center gap-3 z-50">
        <button
          onClick={onBack}
          className="p-2.5 rounded-xl transition-all duration-300 hover:scale-105 flex items-center gap-2"
          style={{ 
            color: "var(--text-dim)",
            background: "var(--surface-card)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="text-sm font-medium">Back</span>
        </button>
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

      {/* Floating particles - hidden on mobile */}
      <div className="pointer-events-none hidden sm:block" aria-hidden>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="particle" />
        ))}
      </div>

      <motion.div
        initial="initial"
        animate="animate"
        className="w-full max-w-md relative z-10 px-2 sm:px-0"
      >
        {/* Logo */}
        <motion.div variants={fadeUp} className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{
              background: "var(--brand-tint-bg)",
              boxShadow: "0 0 40px -8px var(--brand-glow)",
            }}
          >
            <ShieldCheck className="h-7 w-7" style={{ color: "var(--brand-primary)" }} />
          </div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            Admin Login
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Access study analytics and data
          </p>
        </motion.div>

        <motion.div
          variants={fadeUp}
          className="glass-card rounded-2xl sm:rounded-3xl p-5 sm:p-7"
        >
          <div className="space-y-5">
            <div>
              <label htmlFor="password" className="block text-xs font-medium uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                Admin Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder="Enter admin password..."
                className="w-full rounded-xl px-4 py-3 text-sm sm:text-base min-h-[48px] transition-all duration-300 focus:outline-none"
                style={{
                  background: "var(--surface-input)",
                  color: "var(--text-primary)",
                  border: error ? "2px solid var(--destructive)" : "2px solid transparent",
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = "var(--brand-primary)"}
                onBlur={(e) => e.currentTarget.style.borderColor = error ? "var(--destructive)" : "transparent"}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
              {error && (
                <p className="text-xs mt-2" style={{ color: "var(--destructive)" }}>{error}</p>
              )}
            </div>

            <motion.button
              type="button"
              onClick={handleSubmit}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="w-full rounded-xl py-3.5 min-h-[48px] font-semibold text-sm sm:text-base tracking-wide transition-all duration-300"
              style={{
                background: "var(--brand-gradient)",
                color: "var(--btn-primary-text)",
                boxShadow: "var(--brand-shadow)",
              }}
            >
              Login
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
