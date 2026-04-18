"use client"

import { useState } from "react"
import { User, saveUser, setCurrentUser } from "@/lib/store"
import { loginParticipantByUsername } from "../src/services/authService"

interface ParticipantLoginProps {
  onComplete: (user: User) => void
  onBack: () => void
}

export function ParticipantLogin({ onComplete, onBack }: ParticipantLoginProps) {
  const [username, setUsername] = useState("")
  const [error, setError] = useState("")

  const handleLogin = async () => {
    if (!username.trim()) {
      setError("Please enter your username")
      return
    }

    setError("")

    const result = await loginParticipantByUsername(username)

    if (!result || result.error) {
      setError(result?.error || "Login failed")
      return
    }

    const user: User = {
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

    onComplete(user)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-4">
        <h1 className="text-xl font-bold text-center">Participant Login</h1>

        <input
          type="text"
          placeholder="Enter username"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value)
            setError("")
          }}
          className="w-full p-3 rounded border"
        />

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          onClick={handleLogin}
          className="w-full p-3 rounded bg-teal-500 text-white"
        >
          Login
        </button>

        <button
          onClick={onBack}
          className="w-full p-3 rounded border"
        >
          Back
        </button>
      </div>
    </div>
  )
}