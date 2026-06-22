import "server-only";
import PDFDocument from "pdfkit";
import type { AuditLead } from "@/lib/db/schema";
import type { ReputationReport } from "./score";

const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL ?? "https://www.autofivestar.com"
).replace(/\/$/, "");

const BRAND_BLUE = "#2563eb";
const DARK = "#111111";
const GRAY = "#555555";
const LIGHT_GRAY = "#888888";
const BG_LIGHT = "#f8fafc";
const BORDER = "#e2e8f0";

function scoreBandLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Strong";
  if (score >= 60) return "Needs attention";
  return "Likely costing you leads";
}

function scoreColor(score: number): string {
  if (score >= 80) return "#059669";
  if (score >= 65) return "#d97706";
  return "#e11d48";
}

export type PdfReportInput = {
  lead: AuditLead;
  report: ReputationReport;
  demoMode: boolean;
};

export function buildPdfReportData(input: PdfReportInput): PdfReportData {
  const { lead, report } = input;

  const breakdownItems =
    report.breakdownItems && report.breakdownItems.length > 0
      ? report.breakdownItems
      : [
          { label: "Rating", value: report.breakdown.rating, max: 40 },
          { label: "Volume", value: report.breakdown.volume, max: 20 },
          { label: "Recency", value: report.breakdown.recency, max: 20 },
          { label: "Response rate", value: report.breakdown.response, max: 20 },
        ];

  const topFixes = report.recommendations.slice(0, 3);

  const competitors =
    report.competitors && report.competitors.competitors.length > 0
      ? {
          rows: [
            {
              name: `${lead.businessName} (you)`,
              rating: lead.googleRating,
              reviewCount: lead.googleReviewCount,
              isYou: true,
            },
            ...report.competitors.competitors.map((c) => ({
              name: c.name,
              rating: c.rating,
              reviewCount: c.reviewCount,
              isYou: false,
            })),
          ],
          ratingGap: report.competitors.ratingGap,
        }
      : null;

  return {
    businessName: lead.businessName,
    city: lead.city,
    googleRating: lead.googleRating,
    googleReviewCount: lead.googleReviewCount,
    score: report.score,
    grade: report.grade,
    scoreBand: scoreBandLabel(report.score),
    breakdownItems,
    topFixes,
    competitors,
    demoMode: input.demoMode,
  };
}

export type PdfReportData = {
  businessName: string;
  city: string | null;
  googleRating: number | null;
  googleReviewCount: number | null;
  score: number;
  grade: string;
  scoreBand: string;
  breakdownItems: Array<{ label: string; value: number; max: number }>;
  topFixes: string[];
  competitors: {
    rows: Array<{
      name: string;
      rating: number | null;
      reviewCount: number | null;
      isYou: boolean;
    }>;
    ratingGap: number | null;
  } | null;
  demoMode: boolean;
};

export async function generateAuditPdf(input: PdfReportInput): Promise<Buffer> {
  const data = buildPdfReportData(input);
  return renderPdf(data);
}

function renderPdf(data: PdfReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "LETTER",
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title: `Google Reputation Audit — ${data.businessName}`,
        Author: "AutoFiveStar",
        Subject: "Reputation Audit Report",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    // --- Header ---
    doc
      .fontSize(10)
      .fillColor(BRAND_BLUE)
      .text("AUTOFIVESTAR", { continued: false });

    doc.moveDown(0.3);
    doc
      .fontSize(22)
      .fillColor(DARK)
      .text("Google Reputation Audit", { continued: false });

    doc.moveDown(0.3);
    doc
      .fontSize(14)
      .fillColor(GRAY)
      .text(data.businessName, { continued: false });

    if (data.city) {
      doc.fontSize(11).fillColor(LIGHT_GRAY).text(data.city);
    }

    if (data.demoMode) {
      doc.moveDown(0.3);
      doc
        .fontSize(9)
        .fillColor("#92400e")
        .text("PREVIEW AUDIT — Connect your Google Business Profile for live data.");
    }

    doc.moveDown(0.8);

    // --- Divider ---
    const dividerY = doc.y;
    doc
      .moveTo(doc.page.margins.left, dividerY)
      .lineTo(doc.page.margins.left + pageWidth, dividerY)
      .strokeColor(BORDER)
      .lineWidth(1)
      .stroke();

    doc.moveDown(0.5);

    // --- Score section ---
    const scoreColorVal = scoreColor(data.score);

    doc
      .fontSize(11)
      .fillColor(LIGHT_GRAY)
      .text("REPUTATION SCORE", { continued: false });

    doc.moveDown(0.2);

    doc
      .fontSize(42)
      .fillColor(scoreColorVal)
      .text(`${data.score}`, { continued: true })
      .fontSize(16)
      .fillColor(GRAY)
      .text(` / 100   Grade ${data.grade}`, { continued: false });

    doc.moveDown(0.2);
    doc
      .fontSize(11)
      .fillColor(GRAY)
      .text(data.scoreBand, { continued: false });

    doc.moveDown(0.6);

    // --- Google data cards (side by side) ---
    if (data.googleRating !== null || data.googleReviewCount !== null) {
      doc
        .fontSize(11)
        .fillColor(LIGHT_GRAY)
        .text("GOOGLE PROFILE", { continued: false });

      doc.moveDown(0.3);

      const colWidth = pageWidth / 2;
      const cardsY = doc.y;

      if (data.googleRating !== null) {
        doc
          .fontSize(24)
          .fillColor(DARK)
          .text(data.googleRating.toFixed(1), doc.page.margins.left, cardsY);
        doc
          .fontSize(10)
          .fillColor(LIGHT_GRAY)
          .text("Google Rating", doc.page.margins.left, doc.y);
      }

      if (data.googleReviewCount !== null) {
        doc
          .fontSize(24)
          .fillColor(DARK)
          .text(
            data.googleReviewCount.toLocaleString(),
            doc.page.margins.left + colWidth,
            cardsY,
          );
        doc
          .fontSize(10)
          .fillColor(LIGHT_GRAY)
          .text("Total Reviews", doc.page.margins.left + colWidth, doc.y);
      }

      doc.y = Math.max(doc.y, cardsY + 45);
      doc.moveDown(0.6);
    }

    // --- Score breakdown ---
    doc
      .fontSize(11)
      .fillColor(LIGHT_GRAY)
      .text("SCORE BREAKDOWN", { continued: false });

    doc.moveDown(0.3);

    for (const item of data.breakdownItems) {
      const pct = item.max === 0 ? 0 : Math.round((item.value / item.max) * 100);
      doc
        .fontSize(10)
        .fillColor(GRAY)
        .text(`${item.label}`, doc.page.margins.left, doc.y, {
          continued: true,
          width: pageWidth * 0.5,
        })
        .fillColor(DARK)
        .text(`${item.value} / ${item.max}  (${pct}%)`, {
          continued: false,
          align: "right",
          width: pageWidth,
        });

      // Progress bar
      const barY = doc.y + 2;
      const barWidth = pageWidth;
      const barHeight = 6;
      doc
        .roundedRect(doc.page.margins.left, barY, barWidth, barHeight, 3)
        .fillColor("#e2e8f0")
        .fill();

      const fillWidth = Math.max(0, (pct / 100) * barWidth);
      if (fillWidth > 0) {
        const barColor =
          pct >= 70 ? "#059669" : pct >= 40 ? "#d97706" : "#e11d48";
        doc
          .roundedRect(doc.page.margins.left, barY, fillWidth, barHeight, 3)
          .fillColor(barColor)
          .fill();
      }

      doc.y = barY + barHeight + 6;
    }

    doc.moveDown(0.6);

    // --- Competitor comparison ---
    if (data.competitors) {
      maybeNewPage(doc, 120);

      doc
        .fontSize(11)
        .fillColor(LIGHT_GRAY)
        .text("COMPETITOR COMPARISON", { continued: false });

      doc.moveDown(0.3);

      const col1 = doc.page.margins.left;
      const col2 = doc.page.margins.left + pageWidth * 0.55;
      const col3 = doc.page.margins.left + pageWidth * 0.78;

      // Table header
      doc.fontSize(9).fillColor(LIGHT_GRAY);
      doc.text("Business", col1, doc.y);
      doc.text("Rating", col2, doc.y);
      doc.text("Reviews", col3, doc.y);
      doc.moveDown(0.4);

      const headerLineY = doc.y;
      doc
        .moveTo(col1, headerLineY)
        .lineTo(doc.page.margins.left + pageWidth, headerLineY)
        .strokeColor(BORDER)
        .lineWidth(0.5)
        .stroke();
      doc.moveDown(0.2);

      for (const row of data.competitors.rows) {
        const rowY = doc.y;
        doc
          .fontSize(10)
          .fillColor(row.isYou ? BRAND_BLUE : DARK)
          .text(row.name, col1, rowY, { width: pageWidth * 0.5 });
        doc
          .fillColor(DARK)
          .text(
            row.rating !== null ? row.rating.toFixed(1) : "—",
            col2,
            rowY,
          );
        doc.text(
          row.reviewCount !== null ? row.reviewCount.toLocaleString() : "—",
          col3,
          rowY,
        );
        doc.moveDown(0.2);
      }

      if (data.competitors.ratingGap !== null) {
        doc.moveDown(0.2);
        const gapText =
          data.competitors.ratingGap >= 0
            ? `You're ahead of the local average by ${data.competitors.ratingGap.toFixed(1)} stars.`
            : `You're ${Math.abs(data.competitors.ratingGap).toFixed(1)} stars behind the local average.`;
        doc.fontSize(9).fillColor(GRAY).text(gapText);
      }

      doc.moveDown(0.6);
    }

    // --- Top 3 fixes ---
    if (data.topFixes.length > 0) {
      maybeNewPage(doc, 100);

      doc
        .fontSize(11)
        .fillColor(LIGHT_GRAY)
        .text("YOUR TOP 3 FIXES", { continued: false });

      doc.moveDown(0.3);

      data.topFixes.forEach((fix, i) => {
        doc
          .fontSize(10)
          .fillColor(DARK)
          .text(`${i + 1}. ${fix}`, {
            width: pageWidth,
            lineGap: 2,
          });
        doc.moveDown(0.3);
      });

      doc.moveDown(0.4);
    }

    // --- Why reviews matter ---
    maybeNewPage(doc, 120);

    doc
      .fontSize(11)
      .fillColor(LIGHT_GRAY)
      .text("WHY REVIEWS MATTER FOR LOCAL BUSINESSES", {
        continued: false,
      });

    doc.moveDown(0.3);

    const whyPoints = [
      "88% of consumers trust online reviews as much as personal recommendations.",
      "Businesses with more recent reviews appear more active and trustworthy to searchers.",
      "Responding to reviews — positive and negative — signals you care about customer experience.",
      "A half-star improvement in your Google rating can increase customer inquiries by 5-9%.",
    ];

    for (const point of whyPoints) {
      doc
        .fontSize(10)
        .fillColor(GRAY)
        .text(`•  ${point}`, { width: pageWidth, lineGap: 2 });
      doc.moveDown(0.2);
    }

    doc.moveDown(0.6);

    // --- CTA section ---
    maybeNewPage(doc, 130);

    // Background box
    const ctaY = doc.y;
    const ctaHeight = 110;
    doc
      .roundedRect(doc.page.margins.left, ctaY, pageWidth, ctaHeight, 6)
      .fillColor(BG_LIGHT)
      .fill();

    doc.y = ctaY + 14;

    doc
      .fontSize(14)
      .fillColor(DARK)
      .text("Ready to turn this into real review growth?", doc.page.margins.left + 16, doc.y, {
        width: pageWidth - 32,
      });

    doc.moveDown(0.5);

    doc
      .fontSize(10)
      .fillColor(BRAND_BLUE)
      .text(`Start your 7-day free trial: ${APP_URL}/signup?plan=growth`, doc.page.margins.left + 16, doc.y, {
        width: pageWidth - 32,
        link: `${APP_URL}/signup?plan=growth`,
      });

    doc.moveDown(0.3);
    doc
      .fillColor(BRAND_BLUE)
      .text(`Book a demo: ${APP_URL}/contact?topic=demo`, doc.page.margins.left + 16, doc.y, {
        width: pageWidth - 32,
        link: `${APP_URL}/contact?topic=demo`,
      });

    doc.moveDown(0.3);
    doc
      .fillColor(BRAND_BLUE)
      .text(`Visit: ${APP_URL}`, doc.page.margins.left + 16, doc.y, {
        width: pageWidth - 32,
        link: APP_URL,
      });

    doc.y = ctaY + ctaHeight + 10;

    // --- Footer ---
    doc.moveDown(1);
    const footerDivY = doc.y;
    doc
      .moveTo(doc.page.margins.left, footerDivY)
      .lineTo(doc.page.margins.left + pageWidth, footerDivY)
      .strokeColor(BORDER)
      .lineWidth(0.5)
      .stroke();

    doc.moveDown(0.3);
    doc
      .fontSize(8)
      .fillColor(LIGHT_GRAY)
      .text("Powered by AutoFiveStar  •  Built by Tweak & Build", {
        align: "center",
        width: pageWidth,
        link: "https://www.tweakandbuild.com",
      });

    doc.moveDown(0.2);
    doc
      .fontSize(7)
      .fillColor(LIGHT_GRAY)
      .text(
        "This report uses publicly available data. AutoFiveStar does not guarantee ratings, rankings, or revenue.",
        { align: "center", width: pageWidth },
      );

    doc.end();
  });
}

function maybeNewPage(doc: PDFKit.PDFDocument, neededHeight: number): void {
  const remainingHeight =
    doc.page.height - doc.page.margins.bottom - doc.y;
  if (remainingHeight < neededHeight) {
    doc.addPage();
  }
}
