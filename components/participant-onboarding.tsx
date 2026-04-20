"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Heart, ArrowLeft, ArrowRight, Moon, Sun } from "lucide-react"
import { useTheme } from "@/hooks/use-theme"
import { User, saveUser, setCurrentUser } from "@/lib/store"
import { registerParticipant } from "../src/services/authService"


interface ParticipantOnboardingProps {
  onComplete: (user: User) => void
  onBack: () => void
}

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -16, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
}

export function ParticipantOnboarding({ onComplete, onBack }: ParticipantOnboardingProps) {
  const [step, setStep] = useState(1)
  const [studyCode, setStudyCode] = useState("")
  const [nickname, setNickname] = useState("")
  const [error, setError] = useState("")
  const { theme, toggleTheme } = useTheme()

  const handleContinue = () => {
    if (!studyCode.trim()) {
      setError("Please enter a study code")
      return
    }
    // TODO: validate invite_code with backend
    setError("")
    setStep(2)
  }

  // New handle submit
const handleSubmit = async () => {
  if (!nickname.trim()) {
    setError("Please enter a nickname")
    return
  }

  setError("")

  const result = await registerParticipant(studyCode, nickname)

  if (!result || result.error) {
    setError(result?.error || "Registration failed")
    return
  }

  const user: User = {
    id: result.id ? String(result.id) : undefined,
    alias: result.alias,
    role: "participant",
    group: result.group_type,
    studyCode: result.study_code,
    supportCode: result.support_code,
    createdAt: result.created_at,
  }

  saveUser(user)
  setCurrentUser(user)
  localStorage.setItem("user", JSON.stringify(user))

  // Optional: also store support code separately for display later
  localStorage.setItem("supportCode", result.support_code)

  onComplete(user)
}

  return (
    <div className="gradient-bg min-h-screen flex items-center justify-center px-4 py-8 sm:p-4">
      {/* Bottom navigation bar */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center items-center gap-3 z-50">
        <button
          onClick={step === 1 ? onBack : () => setStep(1)}
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
            <Heart className="h-7 w-7" style={{ color: "var(--brand-primary)" }} />
          </div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            Join as Participant
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Step {step} of 2
          </p>
        </motion.div>

        {/* Progress indicator */}
        <motion.div variants={fadeUp} className="flex gap-2 mb-6 justify-center">
          <div 
            className="h-1.5 w-16 rounded-full transition-all duration-300"
            style={{ background: "var(--brand-primary)" }}
          />
          <div 
            className="h-1.5 w-16 rounded-full transition-all duration-300"
            style={{ background: step >= 2 ? "var(--brand-primary)" : "var(--surface-tag)" }}
          />
        </motion.div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              variants={fadeUp}
              initial="initial"
              animate="animate"
              exit="exit"
              className="glass-card rounded-2xl sm:rounded-3xl p-5 sm:p-7"
            >
              <div className="space-y-5">
                <div>
                  <label htmlFor="studyCode" className="block text-xs font-medium uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                    Study Code
                  </label>
                  <input
                    id="studyCode"
                    type="text"
                    value={studyCode}
                    onChange={(e) => { setStudyCode(e.target.value); setError(""); }}
                    placeholder="Enter your study code..."
                    className="w-full rounded-xl px-4 py-3 text-sm sm:text-base min-h-[48px] transition-all duration-300 focus:outline-none"
                    style={{
                      background: "var(--surface-input)",
                      color: "var(--text-primary)",
                      border: error ? "2px solid var(--destructive)" : "2px solid transparent",
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = "var(--brand-primary)"}
                    onBlur={(e) => e.currentTarget.style.borderColor = error ? "var(--destructive)" : "transparent"}
                  />
                  {error && (
                    <p className="text-xs mt-2" style={{ color: "var(--destructive)" }}>{error}</p>
                  )}
                </div>

                <motion.button
                  type="button"
                  onClick={handleContinue}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full rounded-xl py-3.5 min-h-[48px] font-semibold text-sm sm:text-base tracking-wide transition-all duration-300 flex items-center justify-center gap-2"
                  style={{
                    background: "var(--brand-gradient)",
                    color: "var(--btn-primary-text)",
                    boxShadow: "var(--brand-shadow)",
                  }}
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </motion.button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              variants={fadeUp}
              initial="initial"
              animate="animate"
              exit="exit"
              className="glass-card rounded-2xl sm:rounded-3xl p-5 sm:p-7"
            >
              <div className="space-y-5">
                <div>
                  <label htmlFor="nickname" className="block text-xs font-medium uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                    Choose a Nickname
                  </label>
                  <input
                    id="nickname"
                    type="text"
                    value={nickname}
                    onChange={(e) => { setNickname(e.target.value); setError(""); }}
                    placeholder="Enter a nickname..."
                    className="w-full rounded-xl px-4 py-3 text-sm sm:text-base min-h-[48px] transition-all duration-300 focus:outline-none"
                    style={{
                      background: "var(--surface-input)",
                      color: "var(--text-primary)",
                      border: error ? "2px solid var(--destructive)" : "2px solid transparent",
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = "var(--brand-primary)"}
                    onBlur={(e) => e.currentTarget.style.borderColor = error ? "var(--destructive)" : "transparent"}
                  />
                  <p className="text-xs mt-2" style={{ color: "var(--text-dim)" }}>
                    This cannot be changed later.
                  </p>
                  {error && (
                    <p className="text-xs mt-1" style={{ color: "var(--destructive)" }}>{error}</p>
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
                  Enter App
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
