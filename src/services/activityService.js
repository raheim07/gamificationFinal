



async function logSteps(participantId, steps) {
  await supabase.from("activity_logs").insert([
    {
      participant_id: participantId,
      steps: steps,
      date: new Date()
    }
  ])
}






async function getWeeklySteps(participantId) {
  const { data } = await supabase
    .from("activity_logs")
    .select("*")
    .eq("participant_id", participantId)

  return data
}