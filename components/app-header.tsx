"use client"

import { User, setCurrentUser } from "@/lib/store"
import { Heart, LogOut, Moon, Sun } from "lucide-react"
import { motion } from "framer-motion"
import { useTheme } from "@/hooks/use-theme"

interface AppHeaderProps {
  user: User
  onLogout: () => void
}

export function AppHeader({ user, onLogout }: AppHeaderProps) {
  const { theme, toggleTheme } = useTheme()

  const handleLogout = () => {
    setCurrentUser(null)
    onLogout()
  }

  const roleLabel = user.role === "participant"
    ? `Study Code: ${user.studyCode} | Support Code: ${user.supportCode}`
    : user.role === "support"
    ? "Support Member"
    : "Administrator"

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-40 theme-transition"
      style={{
        background: "var(--header-bg)",
        backdropFilter: "blur(20px) saturate(1.5)",
        WebkitBackdropFilter: "blur(20px) saturate(1.5)",
        borderBottom: "1px solid var(--border-header)",
      }}
    >
      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: "var(--brand-tint-bg)",
            }}
          >
            <Heart className="h-4 w-4" style={{ color: "var(--brand-primary)" }} />
          </div>
          <div>
            <h1
              className="font-sans text-sm font-bold tracking-wide leading-tight"
              style={{ color: "var(--text-primary)" }}
            >
              Gamification of Physical Activity Study
            </h1>
            <p className="text-[11px] leading-tight capitalize" style={{ color: "var(--text-dim)" }}>{roleLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-xs sm:text-sm font-medium hidden sm:inline" style={{ color: "var(--text-secondary)" }}>{user.alias}</span>
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg transition-all duration-300 hover:scale-105"
            style={{ 
              color: "var(--text-dim)",
              background: "var(--surface-subtle)",
            }}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            onClick={handleLogout}
            className="transition-all duration-300 hover:scale-105"
            style={{ color: "var(--text-dim)" }}
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.header>
  )
}
