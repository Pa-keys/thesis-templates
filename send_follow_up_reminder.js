// ============================================================
// Follow-Up SMS Reminder Script
// Sends SMS 1 day before a patient's follow-up visit date
// Stack: Supabase (PostgreSQL) + iProg SMS API
// ============================================================

import { createClient } from "@supabase/supabase-js";

// ─── CONFIG ──────────────────────────────────────────────────
// Vite exposes env vars via import.meta.env (client-side)
// This script runs in Node, so we fall back to process.env with the same VITE_ names
const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = import.meta.env?.VITE_SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const IPROG_API_TOKEN = import.meta.env?.VITE_IPROG_API_TOKEN ?? process.env.VITE_IPROG_API_TOKEN;
const IPROG_SMS_URL = "https://www.iprogsms.com/api/v1/sms_messages";
// ─────────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Formats a Philippine mobile number to the 639XXXXXXXXX format
 * required by iProg SMS (e.g. 09171234567 → 639171234567)
 */
function formatPhoneNumber(number) {
  const cleaned = String(number).replace(/\D/g, ""); // strip non-digits
  if (cleaned.startsWith("63")) return cleaned;
  if (cleaned.startsWith("0")) return "63" + cleaned.slice(1);
  if (cleaned.startsWith("9")) return "63" + cleaned;
  return cleaned;
}

/**
 * Sends an SMS via iProg SMS API
 */
async function sendSMS(phoneNumber, message) {
  const formattedNumber = formatPhoneNumber(phoneNumber);

  const response = await fetch(IPROG_SMS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone_number: formattedNumber,
      message: message,
      api_token: IPROG_API_TOKEN,
    }),
  });

  const result = await response.json();
  return { formattedNumber, result, ok: response.ok };
}

/**
 * Main function — fetches tomorrow's follow-ups and sends reminders
 */
async function sendFollowUpReminders() {
  // Build tomorrow's date string in YYYY-MM-DD (PH timezone)
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0]; // e.g. "2026-04-22"

  console.log(`\n📅 Checking follow-ups scheduled for: ${tomorrowStr}\n`);

  // ── 1. Fetch follow_up rows with visit_date = tomorrow ──────
  const { data: followUps, error: followUpError } = await supabase
    .from("follow_up")
    .select("id, visit_date, patient_id")
    .eq("visit_date", tomorrowStr);

  if (followUpError) {
    console.error("❌ Error fetching follow_up records:", followUpError.message);
    return;
  }

  if (!followUps || followUps.length === 0) {
    console.log("✅ No follow-ups scheduled for tomorrow. Nothing to send.");
    return;
  }

  console.log(`📋 Found ${followUps.length} follow-up(s) for tomorrow.\n`);

  // ── 2. Loop and send SMS for each follow-up ─────────────────
  for (const followUp of followUps) {
    const { id: followUpId, visit_date, patient_id } = followUp;

    // Fetch the patient's contact number
    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("contactNumber")
      .eq("id", patient_id)
      .single();

    if (patientError || !patient) {
      console.warn(
        `⚠️  Could not fetch patient (id: ${patient_id}) for follow-up ${followUpId}:`,
        patientError?.message ?? "Not found"
      );
      continue;
    }

    if (!patient.contactNumber) {
      console.warn(
        `⚠️  Patient (id: ${patient_id}) has no contact number. Skipping.`
      );
      continue;
    }

    // Compose the message
    const message =
      `Hello! This is a reminder that you have a follow-up visit scheduled ` +
      `tomorrow, ${visit_date}. Please make sure to come on time. ` +
      `If you need to reschedule, please contact us as soon as possible. Thank you!`;

    // Send the SMS
    const { formattedNumber, result, ok } = await sendSMS(
      patient.contactNumber,
      message
    );

    if (ok) {
      console.log(
        `✅ SMS sent to ${formattedNumber} (patient: ${patient_id}, follow-up: ${followUpId})`
      );
    } else {
      console.error(
        `❌ Failed to send SMS to ${formattedNumber} (follow-up: ${followUpId}):`,
        JSON.stringify(result)
      );
    }
  }

  console.log("\n🏁 Done processing follow-up reminders.\n");
}

// ─── Run ──────────────────────────────────────────────────────
sendFollowUpReminders().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});