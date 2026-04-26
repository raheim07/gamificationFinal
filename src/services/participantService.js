import { supabase } from "../lib/supabaseClient"

export async function getInterventionLeaderboard() {
  try {
    const { data: participants, error } = await supabase
      .from("participants")
      .select("id, alias, group_type")
      .eq("group_type", "intervention")

    if (error) {
      console.error("Leaderboard participant error:", error.message)
      return []
    }

    const leaderboard = []

    for (const participant of participants || []) {
      const { data: logs, error: logError } = await supabase
        .from("activity_logs")
        .select("steps")
        .eq("participant_id", participant.id)

      if (logError) {
        console.error("Leaderboard log error:", logError.message)
        continue
      }

      const totalSteps = (logs || []).reduce(
        (sum, log) => sum + (Number(log.steps) || 0),
        0
      )

      leaderboard.push({
        alias: participant.alias,
        steps: totalSteps,
        points: Math.floor(totalSteps / 100),
      })
    }

    return leaderboard.sort((a, b) => b.points - a.points).slice(0, 5)
  } catch (err) {
    console.error("Leaderboard error:", err)
    return []
  }
}