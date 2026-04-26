import { supabase } from "../lib/supabaseClient";

async function getParticipantByAlias(alias) {
  const { data, error } = await supabase
    .from("participants")
    .select("*")
    .ilike("alias", alias.trim())
    .single();

  if (error) throw error;
  return data;
}

export async function getMessagesForParticipant(alias) {
  try {
    const participant = await getParticipantByAlias(alias);

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("participant_id", participant.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).map((msg) => ({
      id: msg.id,
      from: msg.from_alias,
      text: msg.message_text,
      created_at: msg.created_at,
    }));
  } catch (err) {
    console.error("Error fetching messages:", JSON.stringify(err, null, 2));
    return [];
  }
}

export async function sendSupportMessage(supportCode, supportAlias, messageText) {
  try {
    const { data: participant, error: participantError } = await supabase
      .from("participants")
      .select("*")
      .eq("support_code", supportCode.trim().toUpperCase())
      .single();

    if (participantError) throw participantError;

    const { data, error } = await supabase
      .from("messages")
      .insert([
        {
          participant_id: participant.id,
          from_alias: supportAlias,
          message_text: messageText,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (err) {
    console.error("Error sending support message:", JSON.stringify(err, null, 2));
    return null;
  }
}