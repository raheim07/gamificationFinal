import { addStepsAsync, getWeeklyStepsAsync } from "@/lib/store"

export async function logSteps(participantAlias, steps) {
  return addStepsAsync(participantAlias, steps)
}

export async function getWeeklySteps(participantAlias) {
  return getWeeklyStepsAsync(participantAlias)
}
