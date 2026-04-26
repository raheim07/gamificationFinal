import { supabase } from "../lib/supabaseClient";


function getLocalDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Find participant using alias
async function getParticipantByAlias(alias) {
  const { data, error } = await supabase
    .from("participants")
    .select("*")
    .ilike("alias", alias.trim())
    .single();

  if (error) throw error;
  return data;
}

// Save or update today's steps using alias
export async function saveDailySteps(alias, steps) {
  const participant = await getParticipantByAlias(alias)
  if (!participant) return null

  const today = new Date().toISOString().split("T")[0]

  try {
    const { data: existingLog, error: findError } = await supabase
      .from("activity_logs")
      .select("*")
      .eq("participant_id", participant.id)
      .eq("activity_date", today)
      .maybeSingle()

    if (findError) {
      console.error("Find existing log error:", findError.message)
      return null
    }

    if (existingLog) {
      const { data, error } = await supabase
        .from("activity_logs")
        .update({ steps })
        .eq("id", existingLog.id)
        .select()
        .single()

      if (error) {
        console.error("Update steps error:", error.message)
        return null
      }

      return data
    }

    const { data, error } = await supabase
      .from("activity_logs")
      .insert([
        {
          participant_id: participant.id,
          steps,
          activity_date: today,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("Insert steps error:", error.message)
      return null
    }

    return data
  } catch (err) {
    console.error("Unexpected saveDailySteps error:", err)
    return null
  }
}

// Weekly chart data using alias
// ─── Weekly chart data ─────────────────────────────────────────────────────
// Always returns exactly 7 entries (today and the 6 days before) using LOCAL
// dates. Missing days get steps: 0 so the chart always shows the right labels.
// Because this reads directly from Supabase, any row you add manually in the
// database will appear on the next call — no cache to bust.

export async function getWeeklyActivity(alias) {
  try {
    const participant = await getParticipantByAlias(alias);

    // Build the 7-day window with local dates
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(getLocalDateString(d));
    }

    const startDate = days[0];
    const endDate = days[days.length - 1];

    const { data, error } = await supabase
      .from("activity_logs")
      .select("activity_date, steps")
      .eq("participant_id", participant.id)
      .gte("activity_date", startDate)
      .lte("activity_date", endDate)
      .order("activity_date", { ascending: true });

    if (error) throw error;

    // Index DB rows by date for O(1) lookup
    const byDate = {};
    for (const entry of data || []) {
      byDate[entry.activity_date] = entry.steps;
    }

    // Return all 7 days — zeros for any day not yet in the DB
    return days.map((date) => ({
      date,
      steps: byDate[date] ?? 0,
    }));
  } catch (err) {
    console.error("Error fetching weekly activity:", err);
    return [];
  }
}

// All logs using alias

export async function getAllActivity(alias) {
  try {
    const participant = await getParticipantByAlias(alias);

    const { data, error } = await supabase
      .from("activity_logs")
      .select("activity_date, steps")
      .eq("participant_id", participant.id)
      .order("activity_date", { ascending: true });

    if (error) throw error;

    return (data || []).map((entry) => ({
      date: entry.activity_date,
      steps: entry.steps,
    }));
  } catch (err) {
    console.error("Error fetching all activity:", err);
    return [];
  }
}


function calculateCurrentStreak(logs, threshold = 5000) {
  if (!logs.length) return 0;

  const qualifyingDates = new Set(
    logs.filter((log) => (log.steps || 0) >= threshold).map((log) => log.date)
  );

  const cursor = new Date();
  const todayStr = getLocalDateString(cursor);

  // If today hasn't been logged yet, start streak check from yesterday
  if (!qualifyingDates.has(todayStr)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (true) {
    const dateStr = getLocalDateString(cursor);
    if (qualifyingDates.has(dateStr)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}


// ─── Stats (used by dashboards and badge derivation) ──────────────────────
// Returns extra fields needed for badge checks so we don't need a badges table.

export async function getParticipantStats(alias) {
  try {
    const logs = await getAllActivity(alias);

    const totalSteps = logs.reduce((sum, log) => sum + (log.steps || 0), 0);
    const totalPoints = Math.floor(totalSteps / 100);
    const currentStreak = calculateCurrentStreak(logs, 5000);
    const qualifyingDays = logs.filter((log) => (log.steps || 0) >= 5000).length;
    const adherence = logs.length
      ? Math.round((qualifyingDays / logs.length) * 100)
      : 0;

    // Extra fields for badge derivation — avoids needing a badges table
    const hasTenKDay = logs.some((log) => (log.steps || 0) >= 10000);
    const totalDaysLogged = logs.length;

    return {
      total_steps: totalSteps,
      total_points: totalPoints,
      current_streak: currentStreak,
      adherence,
      has_ten_k_day: hasTenKDay,
      total_days_logged: totalDaysLogged,
    };
  } catch (err) {
    console.error("Error fetching participant stats:", err);
    return {
      total_steps: 0,
      total_points: 0,
      current_streak: 0,
      adherence: 0,
      has_ten_k_day: false,
      total_days_logged: 0,
    };
  }
}


// ─── Today's steps ────────────────────────────────────────────────────────

export async function getTodaySteps(alias) {
  const today = getLocalDateString();
  try {
    const weekly = await getWeeklyActivity(alias);
    const entry = weekly.find((log) => log.date === today);
    return entry?.steps || 0;
  } catch (err) {
    console.error("Error fetching today steps:", err);
    return 0;
  }
}