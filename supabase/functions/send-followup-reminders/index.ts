// ============================================================
// Supabase Edge Function: send-followup-reminders
// Triggered daily by pg_cron to send SMS reminders 1 day
// before a patient's follow-up visit via iProg SMS API
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const IPROG_SMS_URL = "https://www.iprogsms.com/api/v1/sms_messages";

// Edge Functions read secrets from Deno.env (set in Supabase Dashboard)
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const IPROG_API_TOKEN = Deno.env.get("IPROG_API_TOKEN")!;

// ─── Helpers ─────────────────────────────────────────────────

function formatPhoneNumber(number: string): string {
  const cleaned = String(number).replace(/\D/g, "");
  if (cleaned.startsWith("63")) return cleaned;
  if (cleaned.startsWith("0")) return "63" + cleaned.slice(1);
  if (cleaned.startsWith("9")) return "63" + cleaned;
  return cleaned;
}

async function sendSMS(phoneNumber: string, message: string) {
  const formattedNumber = formatPhoneNumber(phoneNumber);

  const response = await fetch(IPROG_SMS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone_number: formattedNumber,
      message,
      api_token: IPROG_API_TOKEN,
    }),
  });

  const result = await response.json();
  return { formattedNumber, result, ok: response.ok };
}

// ─── Main Handler ─────────────────────────────────────────────

Deno.serve(async () => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Tomorrow's date in PH time (UTC+8)
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 8 * 60 * 60 * 1000); // shift to UTC+8
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0]; // YYYY-MM-DD

    console.log(`📅 Checking follow-ups for: ${tomorrowStr}`);

    // 1. Fetch follow-ups scheduled for tomorrow
    const { data: followUps, error: followUpError } = await supabase
      .from("follow_up")
      .select("followup_id, visit_date, patient_id")
      .eq("visit_date", tomorrowStr);

    if (followUpError) throw new Error(followUpError.message);

    if (!followUps || followUps.length === 0) {
      console.log("✅ No follow-ups tomorrow.");
      return new Response(
        JSON.stringify({ message: "No follow-ups tomorrow." }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`📋 Found ${followUps.length} follow-up(s).`);

    const results = [];

    // 2. Send SMS for each follow-up
    for (const followUp of followUps) {
      const { followup_id: followUpId, visit_date, patient_id } = followUp;

      const { data: patient, error: patientError } = await supabase
        .from("patients")
        .select("contactNumber")
        .eq("id", patient_id)
        .single();

      if (patientError || !patient?.contactNumber) {
        console.warn(`⚠️ Skipping patient ${patient_id} — no contact number.`);
        results.push({ followUpId, status: "skipped", reason: "no contact number" });
        continue;
      }

      const message =
        `Hello! This is a reminder that you have a follow-up visit scheduled ` +
        `tomorrow, ${visit_date}. Please make sure to come on time. ` +
        `If you need to reschedule, please contact us as soon as possible. Thank you!`;

      const { formattedNumber, ok, result } = await sendSMS(patient.contactNumber, message);

      if (ok) {
        console.log(`✅ SMS sent to ${formattedNumber} (follow-up: ${followUpId})`);
        results.push({ followUpId, status: "sent", number: formattedNumber });
      } else {
        console.error(`❌ Failed for follow-up ${followUpId}:`, result);
        results.push({ followUpId, status: "failed", error: result });
      }
    }

    return new Response(JSON.stringify({ tomorrowStr, results }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Unhandled error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});