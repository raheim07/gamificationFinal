"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Heart, ArrowLeft, ArrowRight, Moon, Sun } from "lucide-react"
import { useTheme } from "@/hooks/use-theme"
import { User, saveUser, setCurrentUser } from "@/lib/store"
import { loginSupportByCode } from "../src/services/authService"
import { supabase } from "../src/lib/supabaseClient"

interface SupportOnboardingProps {
  onComplete: (user: User) => void
  onBack: () => void
}

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -16, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
}

export function SupportOnboarding({ onComplete, onBack }: SupportOnboardingProps) {
  const [step, setStep] = useState(1)
  const [supportCode, setSupportCode] = useState("")
  const [nickname, setNickname] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const { theme, toggleTheme } = useTheme()

  const [participant, setParticipant] = useState<any>(null)

  // ── Step 1: validate support code ───────────────────────────────────────
  const handleContinue = async () => {
    if (!supportCode.trim()) {
      setError("Please enter a support code")
      return
    }
    setError("")

    const result = await loginSupportByCode(supportCode)
    if (!result || result.error) {
      setError(result?.error || "Invalid support code")
      return
    }

    setParticipant(result)
    setStep(2)
  }

  // ── Step 2: save nickname + insert support_users row ────────────────────
  const handleSubmit = async () => {
    if (!nickname.trim()) {
      setError("Please enter a nickname")
      return
    }
    setError("")
    setSubmitting(true)

    try {
      // Adjust field name if loginSupportByCode returns it differently
      const participantId: string | undefined =
        participant?.id ?? participant?.participant_id

      if (!participantId) {
        setError("Could not resolve participant. Go back and re-enter the support code.")
        return
      }

      // ── THE MISSING PIECE: write the row the dashboard queries ──────────
      const { error: insertErr } = await supabase
        .from("support_users")
        .insert({
          alias: nickname.trim(),
          participant_id: participantId,
        })

      if (insertErr) {
        console.error("support_users insert error:", insertErr)
        setError("Failed to save your account. Please try again.")
        return
      }

      // Persist locally exactly as before
      const user: User = {
        alias: nickname.trim(),
        role: "support",
        supportCode: supportCode.trim().toUpperCase(),
        linkedParticipant: participant?.alias,
        participantGroup: participant?.group_type,
        createdAt: new Date().toISOString(),
      }

      saveUser(user)
      setCurrentUser(user)
      localStorage.setItem("user", JSON.stringify(user))

      onComplete(user)
    } catch (err) {
      console.error("Support onboarding error:", err)
      setError("Something went wrong. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="gradient-bg min-h-screen flex items-center justify-center px-4 py-8 sm:p-4">
      {/* Bottom navigation bar */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center items-center gap-3 z-50">
        <button
          onClick={step === 1 ? onBack : () => { setStep(1); setError("") }}
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

      {/* Floating particles */}
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
            Join as Support
          </h1>
          {participant?.alias && (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Supporting: <strong>{participant.alias}</strong>
            </p>
          )}
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

          {/* ── Step 1: Support code ───────────────────────────────────── */}
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
                  <label
                    htmlFor="supportCode"
                    className="block text-xs font-medium uppercase tracking-wider mb-2"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Support Code
                  </label>
                  <input
                    id="supportCode"
                    type="text"
                    value={supportCode}
                    onChange={(e) => { setSupportCode(e.target.value); setError("") }}
                    placeholder="Enter your support code..."
                    className="w-full rounded-xl px-4 py-3 text-sm sm:text-base min-h-[48px] transition-all duration-300 focus:outline-none"
                    style={{
                      background: "var(--surface-input)",
                      color: "var(--text-primary)",
                      border: error ? "2px solid var(--destructive)" : "2px solid transparent",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--brand-primary)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = error ? "var(--destructive)" : "transparent")}
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

          {/* ── Step 2: Nickname ───────────────────────────────────────── */}
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
                  <label
                    htmlFor="nickname"
                    className="block text-xs font-medium uppercase tracking-wider mb-2"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Choose a Nickname
                  </label>
                  <input
                    id="nickname"
                    type="text"
                    value={nickname}
                    onChange={(e) => { setNickname(e.target.value); setError("") }}
                    placeholder="Enter a nickname..."
                    className="w-full rounded-xl px-4 py-3 text-sm sm:text-base min-h-[48px] transition-all duration-300 focus:outline-none"
                    style={{
                      background: "var(--surface-input)",
                      color: "var(--text-primary)",
                      border: error ? "2px solid var(--destructive)" : "2px solid transparent",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--brand-primary)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = error ? "var(--destructive)" : "transparent")}
                  />
                  <p className="text-xs mt-1.5" style={{ color: "var(--text-dim)" }}>
                    This cannot be changed later.
                  </p>
                  {error && (
                    <p className="text-xs mt-1" style={{ color: "var(--destructive)" }}>{error}</p>
                  )}
                </div>

                <motion.button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  whileHover={{ scale: submitting ? 1 : 1.01 }}
                  whileTap={{ scale: submitting ? 1 : 0.98 }}
                  className="w-full rounded-xl py-3.5 min-h-[48px] font-semibold text-sm sm:text-base tracking-wide transition-all duration-300 disabled:opacity-60"
                  style={{
                    background: "var(--brand-gradient)",
                    color: "var(--btn-primary-text)",
                    boxShadow: "var(--brand-shadow)",
                  }}
                >
                  {submitting ? "Saving…" : "Enter App"}
                </motion.button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </div>
  )
}
