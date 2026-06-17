/**
 * Industry template packs.
 *
 * Each pack provides recommended defaults for brand voice, response style,
 * review-request tone (used by a future automated review-request feature),
 * keyword cautions, and alert recommendations. Packs are applied during
 * onboarding and can be overridden later in /settings.
 */

export const INDUSTRY_PACK_IDS = [
  "hvac",
  "plumbing",
  "roofing",
  "auto_dealer",
  "auto_repair",
  "dentist",
  "restaurant",
  "gym_fitness",
  "cleaning",
  "general",
] as const;

export type IndustryPackId = (typeof INDUSTRY_PACK_IDS)[number];

export type TonePreset =
  | "professional"
  | "friendly"
  | "warm"
  | "luxury"
  | "direct";

export type ResponseLength = "short" | "medium" | "detailed";

export type IndustryPack = {
  id: IndustryPackId;
  name: string;
  emoji: string;
  shortDescription: string;
  defaultTonePreset: TonePreset;
  defaultResponseLength: ResponseLength;
  defaultEmojiAllowed: boolean;
  /** Plain-English voice guidance the AI gets verbatim. */
  responseStyle: string;
  /** How to phrase review-request follow-ups (future PR). */
  reviewRequestTone: string;
  /**
   * Words / phrases that need extra care for this vertical (legal,
   * regulatory, or trust risk). We list them in the prompt so the AI is
   * cautious before promising outcomes.
   */
  cautionPhrases: string[];
  /** UI hint: what alert frequency makes sense for this vertical. */
  alertRecommendations: string;
};

const PACKS: Record<IndustryPackId, IndustryPack> = {
  hvac: {
    id: "hvac",
    name: "HVAC",
    emoji: "❄️",
    shortDescription: "Heating, cooling, and ventilation contractors.",
    defaultTonePreset: "professional",
    defaultResponseLength: "medium",
    defaultEmojiAllowed: false,
    responseStyle:
      "Reference the technician by name when the reviewer does. Acknowledge the urgency of a comfort issue (heat or AC) and the customer's home. Stay concrete about what was fixed without making warranty claims.",
    reviewRequestTone:
      "Ask after the first service visit. Mention the technician and the specific job briefly so the request feels personal.",
    cautionPhrases: [
      "guaranteed efficiency",
      "lifetime warranty",
      "energy savings of …%",
    ],
    alertRecommendations:
      "Immediate alert on 1-2 star reviews. Daily digest for everything else.",
  },
  plumbing: {
    id: "plumbing",
    name: "Plumbing",
    emoji: "🔧",
    shortDescription: "Residential and small commercial plumbing.",
    defaultTonePreset: "professional",
    defaultResponseLength: "medium",
    defaultEmojiAllowed: false,
    responseStyle:
      "Empathize with the homeowner first — plumbing issues are stressful. Acknowledge any after-hours or emergency context. Avoid promising fixed pricing or recurring discounts.",
    reviewRequestTone:
      "Send after the work is complete and the area is dry. Reference the specific repair.",
    cautionPhrases: [
      "guaranteed leak-free",
      "lifetime guarantee",
      "fixed pricing",
    ],
    alertRecommendations:
      "Immediate alert on 1-2 star reviews. Daily digest for the rest.",
  },
  roofing: {
    id: "roofing",
    name: "Roofing",
    emoji: "🏠",
    shortDescription: "Residential roofing and storm damage.",
    defaultTonePreset: "professional",
    defaultResponseLength: "medium",
    defaultEmojiAllowed: false,
    responseStyle:
      "Acknowledge that a roof is a big purchase. If the customer references insurance or storm damage, be careful not to promise claim outcomes. Reinforce that the crew followed local code.",
    reviewRequestTone:
      "Send 1-2 weeks after install once the homeowner has lived under the new roof through some weather.",
    cautionPhrases: [
      "guaranteed insurance claim",
      "lifetime warranty",
      "no leaks ever",
    ],
    alertRecommendations: "Immediate alerts on negative reviews are critical.",
  },
  auto_dealer: {
    id: "auto_dealer",
    name: "Auto Dealer",
    emoji: "🚗",
    shortDescription: "New and used vehicle dealerships.",
    defaultTonePreset: "warm",
    defaultResponseLength: "detailed",
    defaultEmojiAllowed: false,
    responseStyle:
      "Buying a car is emotional. Thank the customer by first name. Reference the model if mentioned. Never promise resale value, fuel economy, or financing approvals.",
    reviewRequestTone:
      "Send the day after delivery. Reference the salesperson and the model.",
    cautionPhrases: [
      "guaranteed APR",
      "guaranteed approval",
      "best price in town",
    ],
    alertRecommendations:
      "Immediate alerts on 1-2 stars. Weekly digest of positives for the GM.",
  },
  auto_repair: {
    id: "auto_repair",
    name: "Auto Repair",
    emoji: "🛠️",
    shortDescription: "Independent repair shops and tire centers.",
    defaultTonePreset: "friendly",
    defaultResponseLength: "medium",
    defaultEmojiAllowed: false,
    responseStyle:
      "Cars cost money to fix. Acknowledge cost without arguing. Praise the customer's choice to maintain the vehicle. Avoid blanket promises about future repairs.",
    reviewRequestTone:
      "Send a day after pickup so the customer has driven the car a bit.",
    cautionPhrases: [
      "guaranteed price",
      "never need this repair again",
      "lifetime warranty",
    ],
    alertRecommendations: "Immediate on 1-2 stars; daily digest otherwise.",
  },
  dentist: {
    id: "dentist",
    name: "Dentist",
    emoji: "🦷",
    shortDescription: "General and cosmetic dental practices.",
    defaultTonePreset: "warm",
    defaultResponseLength: "medium",
    defaultEmojiAllowed: false,
    responseStyle:
      "Lead with warmth — dental visits are anxiety-inducing for many. Never disclose any clinical detail (HIPAA). Refer to staff by first name when the reviewer does. Invite them back for their next cleaning.",
    reviewRequestTone:
      "Send the day after the visit. Reference the visit type (cleaning, consultation) only if it appears in the appointment record.",
    cautionPhrases: [
      "patient name",
      "specific procedure",
      "guaranteed pain-free",
    ],
    alertRecommendations:
      "Immediate alerts on 1-2 stars. Weekly digest of positives.",
  },
  restaurant: {
    id: "restaurant",
    name: "Restaurant",
    emoji: "🍽️",
    shortDescription: "Restaurants, cafés, and casual dining.",
    defaultTonePreset: "friendly",
    defaultResponseLength: "short",
    defaultEmojiAllowed: true,
    responseStyle:
      "Match the vibe of the place. Reference a specific dish or staff member if the review does. Invite them back. Be concise — restaurant reviews are skimmed.",
    reviewRequestTone:
      "Send via email/SMS the day after dining when possible. Keep it short.",
    cautionPhrases: [
      "fastest service",
      "best in town",
      "freshest ingredients",
    ],
    alertRecommendations:
      "Immediate on 1-2 stars (food safety). Daily digest for the rest.",
  },
  gym_fitness: {
    id: "gym_fitness",
    name: "Gym / Fitness",
    emoji: "💪",
    shortDescription: "Gyms, boutique studios, and trainers.",
    defaultTonePreset: "friendly",
    defaultResponseLength: "short",
    defaultEmojiAllowed: true,
    responseStyle:
      "Be encouraging and personal. Reference the class or trainer if mentioned. Never make body-composition or weight-loss promises.",
    reviewRequestTone:
      "Send after the first month so the member has experienced the community.",
    cautionPhrases: [
      "guaranteed weight loss",
      "guaranteed results",
      "guaranteed muscle",
    ],
    alertRecommendations: "Immediate on 1-2 stars; daily digest otherwise.",
  },
  cleaning: {
    id: "cleaning",
    name: "Cleaning Service",
    emoji: "🧽",
    shortDescription: "Residential and commercial cleaners.",
    defaultTonePreset: "professional",
    defaultResponseLength: "short",
    defaultEmojiAllowed: false,
    responseStyle:
      "Thank the customer by first name. Acknowledge specific feedback (areas, attention to detail). Avoid promising any chemical, allergen, or odor outcome.",
    reviewRequestTone:
      "Send the day after the appointment, reference the home or office.",
    cautionPhrases: [
      "guaranteed hypoallergenic",
      "guaranteed eco-friendly",
      "100% bacteria-free",
    ],
    alertRecommendations: "Immediate on 1-2 stars; daily digest otherwise.",
  },
  general: {
    id: "general",
    name: "General Local Business",
    emoji: "🏢",
    shortDescription: "Any other local service business.",
    defaultTonePreset: "professional",
    defaultResponseLength: "medium",
    defaultEmojiAllowed: false,
    responseStyle:
      "Stay grounded, friendly, and specific. Reference details only when they appear in the review. Invite the reviewer back for future business.",
    reviewRequestTone:
      "Send after the customer has had a chance to use the product or service.",
    cautionPhrases: [
      "best in town",
      "guaranteed outcome",
      "lowest price anywhere",
    ],
    alertRecommendations: "Immediate on 1-2 stars; daily digest otherwise.",
  },
};

export function getIndustryPack(
  id: string | null | undefined,
): IndustryPack | null {
  if (!id) return null;
  if ((INDUSTRY_PACK_IDS as readonly string[]).includes(id)) {
    return PACKS[id as IndustryPackId];
  }
  return null;
}

export function listIndustryPacks(): IndustryPack[] {
  return INDUSTRY_PACK_IDS.map((id) => PACKS[id]);
}

export function isIndustryPackId(value: unknown): value is IndustryPackId {
  return (
    typeof value === "string" &&
    (INDUSTRY_PACK_IDS as readonly string[]).includes(value)
  );
}
