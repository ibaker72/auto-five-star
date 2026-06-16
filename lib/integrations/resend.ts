import { Resend } from "resend";

let _client: Resend | null = null;
function client(): Resend {
  if (!_client) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY is required");
    _client = new Resend(key);
  }
  return _client;
}

const FROM = process.env.RESEND_FROM_EMAIL ?? "hello@autofivestar.com";

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}) {
  const { data, error } = await client().emails.send({
    from: `AutoFiveStar <${FROM}>`,
    to: [params.to],
    subject: params.subject,
    html: params.html,
    text: params.text,
    replyTo: params.replyTo,
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
  return data;
}

export function newReviewAlertEmail(args: {
  recipientName?: string;
  businessName: string;
  rating: number;
  reviewer: string;
  excerpt: string;
  reviewUrl: string;
}) {
  const stars = "★".repeat(args.rating) + "☆".repeat(5 - args.rating);
  return {
    subject: `${stars} New ${args.rating}-star review for ${args.businessName}`,
    html: `
      <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 560px; margin: 0 auto;">
        <h2>New review for ${escapeHtml(args.businessName)}</h2>
        <p style="font-size:18px;">${stars}</p>
        <p><strong>${escapeHtml(args.reviewer)}</strong> wrote:</p>
        <blockquote style="border-left:3px solid #ddd; padding-left:12px; color:#444;">
          ${escapeHtml(args.excerpt)}
        </blockquote>
        <p>
          <a href="${args.reviewUrl}"
             style="display:inline-block; background:#2563eb; color:#fff;
                    padding:10px 16px; border-radius:6px; text-decoration:none;">
            Draft a reply in AutoFiveStar
          </a>
        </p>
        <p style="color:#888; font-size:12px;">
          You're getting this because review alerts are enabled for your account.
        </p>
      </div>
    `,
    text: `New ${args.rating}-star review for ${args.businessName} from ${args.reviewer}: "${args.excerpt}". Reply at ${args.reviewUrl}`,
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
