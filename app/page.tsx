"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { User, getCurrentUser } from "@/lib/store"
import { EntryScreen } from "@/components/entry-screen"
import { ParticipantOnboarding } from "@/components/participant-onboarding"
import { SupportOnboarding } from "@/components/support-onboarding"
import { AdminLogin } from "@/components/admin-login"
import { AppHeader } from "@/components/app-header"
import { ControlDashboard } from "@/components/control-dashboard"
import { InterventionDashboard } from "@/components/intervention-dashboard"
import { SupportDashboard } from "@/components/support-dashboard"
import { AdminDashboard } from "@/components/admin-dashboard"
import { ParticipantLogin } from "@/components/participant-login"

function FloatingParticles() {
  return (
    <div className="pointer-events-none hidden sm:block" aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="particle" />
      ))}
    </div>
  )
}

type OnboardingFlow = "entry" | "participant" | "participant-login" | "support" | "admin" | null

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
}

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -16, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
}

export default function Page() {
  const [user, setUser] = useState<User | null>(null)
  const [mounted, setMounted] = useState(false)
  const [introPlayed, setIntroPlayed] = useState(false)
  const [onboardingFlow, setOnboardingFlow] = useState<OnboardingFlow>("entry")

  useEffect(() => {
    setMounted(true)
    // Check for returning user - skip onboarding if exists
    const stored = getCurrentUser()
    if (stored) {
      setUser(stored)
      setOnboardingFlow(null)
    }
    const timer = setTimeout(() => setIntroPlayed(true), 800)
    return () => clearTimeout(timer)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("user")
    localStorage.removeItem("supportCode")
    setUser(null)
    setOnboardingFlow("entry")
  }

  if (!mounted) {
    return (
      <div className="gradient-bg min-h-screen flex items-center justify-center">
        <FloatingParticles />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center gap-3"
        >
          <div className="w-10 h-10 border-2 rounded-full animate-spin" style={{ borderColor: "var(--brand-primary)", borderTopColor: "transparent" }} />
          <span className="text-sm tracking-wide" style={{ color: "var(--text-muted)" }}>Loading study...</span>
        </motion.div>
      </div>
    )
  }

  // Onboarding flows
  if (!user) {
    if (onboardingFlow === "entry") {
      return (
        <EntryScreen 
          onSelect={(choice) => setOnboardingFlow(choice)} 
        />
      )
    }

    if (onboardingFlow === "participant") {
      return (
        <ParticipantOnboarding
          onComplete={(newUser) => {
            setUser(newUser)
            setOnboardingFlow(null)
          }}
          onBack={() => setOnboardingFlow("entry")}
        />
      )
    }
    if (onboardingFlow === "participant-login") {
      return (
        <ParticipantLogin
          onComplete={(newUser) => {
            setUser(newUser)
            setOnboardingFlow(null)
          }}
          onBack={() => setOnboardingFlow("entry")}
        />
      )
    }

    if (onboardingFlow === "support") {
      return (
        <SupportOnboarding
          onComplete={(newUser) => {
            setUser(newUser)
            setOnboardingFlow(null)
          }}
          onBack={() => setOnboardingFlow("entry")}
        />
      )
    }

    if (onboardingFlow === "admin") {
      return (
        <AdminLogin
          onComplete={(newUser) => {
            setUser(newUser)
            setOnboardingFlow(null)
          }}
          onBack={() => setOnboardingFlow("entry")}
        />
      )
    }

    // Fallback to entry screen
    return (
      <EntryScreen 
        onSelect={(choice) => setOnboardingFlow(choice)} 
      />
    )
  }

  // Main dashboard view
  return (
    <div className="gradient-bg min-h-screen">
      <FloatingParticles />
      <AppHeader user={user} onLogout={handleLogout} />
      <AnimatePresence mode="wait">
        <motion.main
          key={user.alias + user.role}
          variants={stagger}
          initial="initial"
          animate="animate"
          exit="exit"
          className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-12 sm:pb-16"
        >
          <motion.div variants={fadeUp}>
            {user.role === "participant" && user.group === "control" && (
              <ControlDashboard user={user} />
            )}
            {user.role === "participant" && user.group === "intervention" && (
              <InterventionDashboard user={user} introPlayed={introPlayed} />
            )}
            {user.role === "support" && (
              <SupportDashboard user={user} />
            )}
            {user.role === "admin" && (
              <AdminDashboard />
            )}
          </motion.div>
        </motion.main>
      </AnimatePresence>
    </div>
  )
}
