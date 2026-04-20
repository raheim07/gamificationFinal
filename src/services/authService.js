import { getSupabaseClient } from "../lib/supabaseClient"

function getConfigurationError(error) {
  if (error?.message?.includes("Supabase is not configured")) {
    return "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local, then restart the dev server."
  }

  return null
}

export async function registerParticipant(studyCode, alias) {
  try {
    const supabase = getSupabaseClient()
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
    const configurationError = getConfigurationError(err)
    if (configurationError) {
      return { error: configurationError }
    }

    console.error("Registration error:", err)
    return { error: err?.message || "Unexpected registration error" }
  }
}

export async function loginParticipantByUsername(alias) {
  try {
    const supabase = getSupabaseClient()
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
    const configurationError = getConfigurationError(err)
    if (configurationError) {
      return { error: configurationError }
    }

    return { error: err?.message || "Login failed" }
  }
}

export async function loginSupportByCode(supportCode) {
  try {
    const supabase = getSupabaseClient()
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
    const configurationError = getConfigurationError(err)
    if (configurationError) {
      return { error: configurationError }
    }

    return { error: "Login failed" }
  }
}
