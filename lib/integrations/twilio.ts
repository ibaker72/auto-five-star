import twilio, { type Twilio } from "twilio";

let _client: Twilio | null = null;
function client(): Twilio | null {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  if (!_client) _client = twilio(sid, token);
  return _client;
}

/**
 * Send an SMS. No-op (returns null) when Twilio is not configured so dev
 * environments do not require Twilio creds.
 */
export async function sendSms(params: { to: string; body: string }) {
  const c = client();
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!c || !from) {
    console.warn("[twilio] not configured, skipping SMS to", params.to);
    return null;
  }
  return c.messages.create({
    to: params.to,
    from,
    body: params.body,
  });
}

export function lowStarReviewSms(args: {
  rating: number;
  businessName: string;
  reviewer: string;
}): string {
  return `AutoFiveStar: new ${args.rating}-star review for ${args.businessName} from ${args.reviewer}. Reply in the dashboard.`;
}
