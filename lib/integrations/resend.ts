import "server-only";
import { Resend } from "resend";

const EMAIL_LIVE = process.env.EMAIL_LIVE === "true";
const IS_PROD = process.env.NODE_ENV === "production";

export class EmailConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailConfigError";
  }
}

let _client: Resend | null = null;
function client(): Resend {
  if (!_client) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new EmailConfigError("RESEND_API_KEY is required");
    _client = new Resend(key);
  }
  return _client;
}

const FROM = process.env.RESEND_FROM_EMAIL ?? "hello@autofivestar.com";

export type SendEmailResult = {
  ok: boolean;
  fixture: boolean;
  providerId: string | null;
  error?: string;
};

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

export async function sendEmail(
  params: SendEmailInput,
): Promise<SendEmailResult> {
  // Fixture mode: dev + EMAIL_LIVE=false. Never silent in prod.
  if (!EMAIL_LIVE) {
    if (IS_PROD) {
      throw new EmailConfigError(
        "EMAIL_LIVE=true required in production. Refusing to fixture-send.",
      );
    }
    console.log(
      `[email/fixture] to=${params.to} subject=${JSON.stringify(params.subject)}`,
    );
    return { ok: true, fixture: true, providerId: null };
  }

  try {
    const { data, error } = await client().emails.send({
      from: `AutoFiveStar <${FROM}>`,
      to: [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text,
      replyTo: params.replyTo,
    });
    if (error) {
      return {
        ok: false,
        fixture: false,
        providerId: null,
        error: error.message,
      };
    }
    return {
      ok: true,
      fixture: false,
      providerId: data?.id ?? null,
    };
  } catch (err) {
    return {
      ok: false,
      fixture: false,
      providerId: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export type NewReviewAlertEmailInput = {
  recipientName?: string | null;
  businessName: string;
  locationName: string;
  rating: number;
  reviewerName: string;
  excerpt: string;
  reviewUrl: string;
};

export async function sendNewReviewAlertEmail(
  to: string,
  input: NewReviewAlertEmailInput,
): Promise<SendEmailResult> {
  const stars = "★".repeat(input.rating) + "☆".repeat(5 - input.rating);
  const urgent = input.rating <= 2;
  const subject = urgent
    ? `New ${input.rating}-star review needs attention — ${input.locationName}`
    : `New ${input.rating}-star review received — ${input.locationName}`;

  const greeting = input.recipientName
    ? `Hi ${escapeHtml(input.recipientName.split(" ")[0] ?? "")},`
    : "Hi,";

  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 560px; margin: 0 auto; color: #111;">
      <p style="font-size:14px; color:#666; margin: 0 0 4px;">AutoFiveStar</p>
      <h2 style="margin:0 0 12px;">${urgent ? "Negative review needs attention" : "New review received"}</h2>
      <p>${greeting}</p>
      <p>A new review came in for <strong>${escapeHtml(input.businessName)}</strong> &middot; ${escapeHtml(input.locationName)}.</p>
      <p style="font-size:20px; color:${urgent ? "#dc2626" : "#f59e0b"}; margin: 12px 0;">${stars}</p>
      <p style="margin:0 0 4px;"><strong>${escapeHtml(input.reviewerName)}</strong> wrote:</p>
      <blockquote style="border-left:3px solid #ddd; padding-left:12px; color:#444; margin:8px 0 16px;">
        ${escapeHtml(input.excerpt)}
      </blockquote>
      <p>
        <a href="${input.reviewUrl}"
           style="display:inline-block; background:#2563eb; color:#fff;
                  padding:10px 16px; border-radius:6px; text-decoration:none;">
          Draft a reply in AutoFiveStar
        </a>
      </p>
      <p style="color:#888; font-size:12px; margin-top:24px;">
        You're receiving this because review alerts are enabled. Update preferences in
        <a href="https://www.autofivestar.com/settings" style="color:#888;">your settings</a>.
      </p>
    </div>
  `;

  const text = `${input.rating}-star review for ${input.businessName} (${input.locationName}) from ${input.reviewerName}: "${input.excerpt}". Reply: ${input.reviewUrl}`;

  return sendEmail({ to, subject, html, text });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
