import { supabase } from "../lib/supabaseClient"

export async function registerParticipant(studyCode, alias) {
  try {
    const trimmedStudyCode = studyCode.trim()
    const trimmedAlias = alias.trim()

    const { data, error } = await supabase.rpc("register_participant", {
      p_study_code: trimmedStudyCode,
      p_alias: trimmedAlias,
    })

    if (error) {
      console.error("Supabase RPC error:", error)
      return { error: error.message || "Registration failed" }
    }

    return data
  } catch (err) {
    console.error("Registration error:", err)
    return { error: err?.message || "Unexpected registration error" }
  }
}

export async function loginParticipantByUsername(alias) {
  try {
    const { data, error } = await supabase
      .from("participants")
      .select("*")
      .ilike("alias", alias.trim())
      .single()

    if (error) {
      return { error: "Username not found" }
    }

    return data
  } catch (err) {
    return { error: err?.message || "Login failed" }
  }
}

export async function loginSupportByCode(supportCode) {
  try {
    const { data, error } = await supabase
      .from("participants")
      .select("*")
      .eq("support_code", supportCode.trim().toUpperCase())
      .single()

    if (error) {
      return { error: "Invalid support code" }
    }

    return data
  } catch (err) {
    return { error: "Login failed" }
  }
}