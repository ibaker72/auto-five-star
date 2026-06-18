/**
 * Industry-specific marketing copy for the programmatic /industries/[slug]
 * pages. Each entry pairs with an `IndustryPack` in
 * `lib/templates/industry-packs.ts` and supplies the on-page narrative copy,
 * sample review/response pairs, FAQs, and conversion language.
 *
 * The packs in `industry-packs.ts` are the source of truth for
 * product behavior (brand voice defaults, caution phrases, alert
 * recommendations); this file is the source of truth for marketing copy
 * that doesn't belong in the product layer.
 */

import type { IndustryPackId } from "./industry-packs";

export type IndustrySeo = {
  /** URL slug — dashed form of the pack id. */
  slug: string;
  /** Pack id this entry is keyed to. */
  packId: IndustryPackId;
  /** H1 — short, vertical-specific. */
  headline: string;
  /** Page meta title. */
  metaTitle: string;
  /** Page meta description. */
  metaDescription: string;
  /** One-paragraph subhead beneath the H1. */
  subhead: string;
  /** Two pain points specific to this vertical. */
  painPoints: { title: string; body: string }[];
  /** One sample review + AI response pair (sample copy only). */
  sample: {
    reviewer: string;
    rating: 1 | 2 | 3 | 4 | 5;
    body: string;
    response: string;
  };
  /** Three FAQ entries specific to the vertical. */
  faqs: { q: string; a: string }[];
  /** Bottom-of-page closing line above the CTA. */
  closingLine: string;
};

const ENTRIES = {
  hvac: {
    slug: "hvac",
    packId: "hvac",
    metaTitle: "Review Management for HVAC Contractors",
    metaDescription:
      "AI review responses, instant alerts, and review-request automation built for HVAC contractors. 14-day free trial.",
    headline: "Review management built for HVAC contractors",
    subhead:
      "Homeowners pick HVAC contractors the way they pick surgeons — by reading every review. AutoFiveStar monitors your Google profile 24/7, drafts professional responses in your voice, and turns happy customers into more five-star reviews.",
    painPoints: [
      {
        title: "Emergency calls don't leave time for reviews",
        body: "You're out on a no-heat call at 11pm. By the time you check Google, a 1-star review has been sitting for 18 hours and the next prospect already scrolled past.",
      },
      {
        title: "Techs are great. Marketing isn't.",
        body: "Your crews do the work. Asking each one to manage online reputation isn't realistic. AutoFiveStar handles it without adding a single task to their day.",
      },
    ],
    sample: {
      reviewer: "Marcus T.",
      rating: 5,
      body: "Mike showed up on a Sunday for our AC and had it running in 40 minutes. Fair price, no upsell, explained everything. Will absolutely call again.",
      response:
        "Thank you, Marcus — Mike will be glad to hear this. We know a Sunday outage is stressful and we're grateful you trusted us. Reach out anytime.",
    },
    faqs: [
      {
        q: "Does it work with my service software (ServiceTitan, Housecall Pro, etc.)?",
        a: "AutoFiveStar connects to your Google Business Profile, not your CRM. It runs alongside any HVAC service software with zero integration work.",
      },
      {
        q: "Can I send review requests after every service call?",
        a: "Yes. On Growth and Pro you can send single email/SMS requests, bulk-upload from CSV, or print a QR code for your trucks and invoices. Templates are pre-tuned for HVAC.",
      },
      {
        q: "What happens with a negative review at 2am?",
        a: "Negative reviews trigger an instant SMS (Growth and Pro) and an email. The AI drafts three response variants you can approve from your phone in seconds.",
      },
    ],
    closingLine:
      "Stop letting reviews sit unanswered while you're on a job site.",
  },

  plumbing: {
    slug: "plumbing",
    packId: "plumbing",
    metaTitle: "Review Management for Plumbing Companies",
    metaDescription:
      "AI-drafted review responses and review-request automation for residential and commercial plumbers. 14-day free trial.",
    headline: "Reviews are how homeowners pick their plumber",
    subhead:
      "Burst pipe at midnight, kids in the house — they're not calling the cheapest plumber, they're calling the one with 4.8 stars and a thoughtful response on every review. AutoFiveStar makes sure that's you.",
    painPoints: [
      {
        title: "After-hours emergencies, quiet Google profile",
        body: "You're the one taking the 3am call. By morning the customer left a glowing review — and nobody responded. Multiply that across 200 jobs a year and you're leaving real money on the table.",
      },
      {
        title: "One angry review can dominate the page",
        body: "An unanswered 1-star sits at the top of your profile until something pushes it down. AutoFiveStar alerts you the moment one lands so you can respond before the next customer sees it.",
      },
    ],
    sample: {
      reviewer: "Jen R.",
      rating: 5,
      body: "Called at 11pm for a leak under the kitchen sink. Tech was here in 35 minutes, fixed it for half what I expected, didn't try to sell me anything. Pros.",
      response:
        "Thanks, Jen — we know a midnight leak is the last thing anyone wants to deal with. Glad we could get you back to normal quickly. We're here whenever you need us.",
    },
    faqs: [
      {
        q: "Will the AI sound like a 'corporate' plumbing company?",
        a: "No. Our plumbing template defaults to professional, empathetic, and short — the way an owner actually writes. You can tune tone and signature in settings.",
      },
      {
        q: "Can I respond from my phone?",
        a: "Yes. AutoFiveStar works on mobile. SMS alerts include a direct link to approve and post the response in under 30 seconds.",
      },
      {
        q: "What about Yelp?",
        a: "We pull Yelp reviews so you see everything in one inbox. Yelp doesn't allow API replies, so we generate the draft for you to copy-paste — still much faster than writing from scratch.",
      },
    ],
    closingLine:
      "Win the next emergency call by having a 4.8-star profile when they search.",
  },

  roofing: {
    slug: "roofing",
    packId: "roofing",
    metaTitle: "Review Management for Roofing Contractors",
    metaDescription:
      "Instant review alerts and AI-drafted responses for roofers and storm-damage contractors. 14-day free trial.",
    headline: "Roof replacements are a $15,000 decision. Reviews close the sale.",
    subhead:
      "When a homeowner is choosing between three roofers, the one with the most thoughtful responses on Google wins. AutoFiveStar makes you that company without adding work to your week.",
    painPoints: [
      {
        title: "Storm season floods you with jobs — and reviews",
        body: "20 jobs in three weeks. A wave of reviews follows. Most go unanswered, the negative ones linger, and the next storm-season prospect notices.",
      },
      {
        title: "Insurance claim reviews need careful wording",
        body: "Promising claim outcomes is a legal risk. AutoFiveStar's roofing template is tuned to avoid claim, warranty, and 'no leaks ever' language by default.",
      },
    ],
    sample: {
      reviewer: "David K.",
      rating: 5,
      body: "Hail damage in April. Crew was here in two weeks, finished in three days, cleaned up better than they found it. Insurance work was smooth.",
      response:
        "Thank you, David. We're glad the crew left the job site clean — that's something we take seriously. Reach out anytime you need anything from us.",
    },
    faqs: [
      {
        q: "Can I tune the AI for insurance / storm-damage reviews?",
        a: "Yes. Our roofing template automatically avoids claim outcome promises and lifetime warranties. You can add additional caution phrases in settings.",
      },
      {
        q: "What about reviews on Facebook?",
        a: "We pull Google primarily. Facebook page reviews are on the roadmap. Today the fastest ROI is on Google, where 90%+ of decision-driving searches happen.",
      },
      {
        q: "Do you help with review requests after install?",
        a: "Yes. Send email/SMS requests 1–2 weeks after install (the recommended window for roofing) so the homeowner has lived under the new roof through some weather.",
      },
    ],
    closingLine:
      "Make every storm-season job into a five-star review on Google.",
  },

  "auto-dealer": {
    slug: "auto-dealer",
    packId: "auto_dealer",
    metaTitle: "Review Management for Auto Dealerships",
    metaDescription:
      "AI-powered Google review management for new and used dealerships. Tune the brand voice, alert by store, run review-request campaigns. 14-day free trial.",
    headline: "Dealership reviews drive showroom traffic. We manage them.",
    subhead:
      "Buyers research for weeks and pick the dealer with the cleanest online reputation. AutoFiveStar gives your GM, sales manager, and BDC one inbox to handle every Google review across every rooftop.",
    painPoints: [
      {
        title: "Multiple rooftops, no single source of truth",
        body: "Each store has its own Google profile. Without one place to monitor and respond, half the reviews go untouched.",
      },
      {
        title: "Service reviews vs. sales reviews need different voices",
        body: "A service one-star is a different conversation than a sales one-star. AutoFiveStar separates them and tunes the response style accordingly.",
      },
    ],
    sample: {
      reviewer: "Erin S.",
      rating: 5,
      body: "Bought our family SUV from Tony last week. He listened, didn't pressure us, and the finance process was the easiest I've ever had at a dealer.",
      response:
        "Thank you, Erin — Tony will love hearing this. Enjoy the new SUV. Whenever you're ready for service, our team is here for you.",
    },
    faqs: [
      {
        q: "Can I manage multiple rooftops from one login?",
        a: "Yes. The Pro plan supports up to 10 locations under one account, with per-location filters and reporting.",
      },
      {
        q: "Will the AI mention the salesperson or service advisor?",
        a: "Only when the reviewer mentions them first. Our dealer template defaults to first-name acknowledgment without inventing details.",
      },
      {
        q: "Can I export reviews for monthly OEM reports?",
        a: "Yes. Pro plans include CSV export of all reviews, responses, and timestamps for compliance reporting.",
      },
    ],
    closingLine:
      "Show up cleaner than the dealer 10 miles down the road.",
  },

  "auto-repair": {
    slug: "auto-repair",
    packId: "auto_repair",
    metaTitle: "Review Management for Auto Repair Shops",
    metaDescription:
      "AI review responses and review-request automation for independent repair shops and tire centers. 14-day free trial.",
    headline: "More five-star reviews than the dealer down the street",
    subhead:
      "Independent shops win on trust. AutoFiveStar makes sure that trust shows up on Google — even when you're under the hood and nobody has time to type replies.",
    painPoints: [
      {
        title: "You do better work than the dealership — your Google profile doesn't show it",
        body: "Walk-in customers leave glowing five-star reviews. Most sit unanswered for weeks. AutoFiveStar drafts the reply the same day they post.",
      },
      {
        title: "Pricing complaints need careful handling",
        body: "Cars cost money to fix. The AI is tuned to acknowledge cost without arguing — the right move for a one-star price complaint.",
      },
    ],
    sample: {
      reviewer: "Brian P.",
      rating: 5,
      body: "Took my truck in for brakes. Quote was honest, no upsell on stuff I didn't need. Done same-day. Highly recommend.",
      response:
        "Thanks, Brian — appreciate the trust. Glad we could keep it straightforward and get you back on the road the same day.",
    },
    faqs: [
      {
        q: "Can I send review requests on every invoice?",
        a: "Yes. Print a QR code for your invoices and customer-pickup envelopes, or send email/SMS requests automatically the day after pickup.",
      },
      {
        q: "What about negative reviews about pricing?",
        a: "Our auto-repair template never argues about cost. It acknowledges the customer's experience, avoids defensive language, and invites them to follow up offline.",
      },
      {
        q: "Do I need any new software at the shop?",
        a: "No. AutoFiveStar runs in the browser. Connect Google once and it works alongside any shop management system.",
      },
    ],
    closingLine:
      "Earn your reputation in the shop. Show it off on Google.",
  },

  dentist: {
    slug: "dentist",
    packId: "dentist",
    metaTitle: "Review Management for Dental Practices",
    metaDescription:
      "HIPAA-conscious AI review responses and review-request automation for general and cosmetic dentists. 14-day free trial.",
    headline: "Dental reviews — handled, with HIPAA-conscious language",
    subhead:
      "A 4.8-star practice can lose patients to a 4.9-star competitor down the road. AutoFiveStar drafts warm, careful replies in your voice without ever disclosing clinical detail.",
    painPoints: [
      {
        title: "Front-desk doesn't have time to write thoughtful replies",
        body: "Between scheduling, insurance verification, and patient flow, the inbox of new reviews never gets touched. AutoFiveStar drafts them the day they post.",
      },
      {
        title: "Clinical detail in a public reply is a HIPAA risk",
        body: "Our dental template explicitly avoids clinical detail and patient names beyond what the reviewer already published. You stay safe by default.",
      },
    ],
    sample: {
      reviewer: "Maria L.",
      rating: 5,
      body: "Best dentist I've ever been to. The hygienist made my anxious 7-year-old comfortable. Dr. K explained everything carefully. Switching the whole family.",
      response:
        "Thank you, Maria. Knowing we made the visit a comfortable one means the world to our team. We can't wait to welcome the whole family.",
    },
    faqs: [
      {
        q: "Does AutoFiveStar work with my practice management software?",
        a: "Yes — it sits alongside any PMS (Dentrix, Eaglesoft, Open Dental, etc.). We connect to Google Business Profile, not your patient data.",
      },
      {
        q: "How do you handle HIPAA in responses?",
        a: "The AI is instructed to never reference clinical procedures, treatment details, or patient names beyond what the reviewer published. You can review every draft before it posts.",
      },
      {
        q: "Can I send review requests after a cleaning?",
        a: "Yes. Send email/SMS requests the day after the visit. The dental template uses warm, simple language and avoids anything that could read as 'incentivizing' reviews.",
      },
    ],
    closingLine:
      "Be the practice with the highest rating in your zip code.",
  },

  restaurant: {
    slug: "restaurant",
    packId: "restaurant",
    metaTitle: "Review Management for Restaurants",
    metaDescription:
      "AI review responses and review-request automation for restaurants, cafés, and casual dining. 14-day free trial.",
    headline: "Reviews are how diners pick their next meal",
    subhead:
      "A four-star restaurant with thoughtful replies beats a 4.5-star with crickets. AutoFiveStar drafts short, on-brand responses that match your vibe — without your manager spending an hour a day at the host stand typing them.",
    painPoints: [
      {
        title: "Reviews come in faster than your manager can answer them",
        body: "Friday and Saturday alone can generate 20+ reviews. By Sunday afternoon nobody has touched them. AutoFiveStar drafts every one and your manager approves in 30 seconds each.",
      },
      {
        title: "One bad review can dominate a Google search",
        body: "An unanswered 2-star about a long wait sits at the top of your profile. AutoFiveStar alerts the moment it lands so it gets a thoughtful, professional response before the next diner reads it.",
      },
    ],
    sample: {
      reviewer: "Sam W.",
      rating: 5,
      body: "Best carbonara in the city. Sat at the bar, chef came out and chatted. Will be back this weekend.",
      response: "Sam — thank you! We'll save the bar seat for you 🍝",
    },
    faqs: [
      {
        q: "Can the AI sound casual and use emoji?",
        a: "Yes. The restaurant template defaults to friendly and short, with emoji allowed. Tune the vibe to match your concept in settings.",
      },
      {
        q: "Can I send review requests to my email list?",
        a: "Yes. Bulk-upload past customers from a CSV on Growth or Pro and send personalized requests in a single campaign.",
      },
      {
        q: "What about Yelp?",
        a: "We pull Yelp reviews so you see everything in one inbox. Yelp doesn't allow API replies, so we generate drafts for you to copy-paste.",
      },
    ],
    closingLine:
      "Make every weekend's reviews work for next weekend's reservations.",
  },

  "gym-fitness": {
    slug: "gym-fitness",
    packId: "gym_fitness",
    metaTitle: "Review Management for Gyms & Fitness Studios",
    metaDescription:
      "AI-drafted review responses and review-request automation for gyms, boutique studios, and trainers. 14-day free trial.",
    headline: "Members pick the gym with the most thoughtful reviews",
    subhead:
      "Boutique studios live or die on community. AutoFiveStar drafts encouraging, personal replies to every member review — without making body-composition or weight-loss promises.",
    painPoints: [
      {
        title: "Member retention shows up in reviews — and is gone in days",
        body: "A new member writes a glowing review after week three. Nobody replies. They churn at month six. The review still sits there, unanswered.",
      },
      {
        title: "Trainers shouldn't make weight-loss promises in public",
        body: "Our gym template is tuned to avoid 'guaranteed weight loss' and 'guaranteed results' language. The AI stays encouraging without making promises.",
      },
    ],
    sample: {
      reviewer: "Priya K.",
      rating: 5,
      body: "Joined three months ago after a bad gym experience elsewhere. The trainers actually care and the community is real. So glad I found this place.",
      response:
        "Priya — we're glad you found us, too. The community is what makes this place what it is. See you in class 💪",
    },
    faqs: [
      {
        q: "Will the AI make weight-loss promises?",
        a: "No. The fitness template explicitly avoids body-composition, weight-loss, and 'guaranteed results' language by default.",
      },
      {
        q: "Can I send review requests to new members?",
        a: "Yes. We recommend sending after the first month, once the member has experienced the community. Templates are pre-written for that timing.",
      },
      {
        q: "Does this work for a single trainer / studio?",
        a: "Yes. The Starter plan covers one location for $49/mo — perfect for a boutique studio or independent trainer.",
      },
    ],
    closingLine:
      "Be the studio everyone tags in their fitness journey posts.",
  },

  cleaning: {
    slug: "cleaning",
    packId: "cleaning",
    metaTitle: "Review Management for Cleaning Services",
    metaDescription:
      "AI review responses and review-request automation for residential and commercial cleaning companies. 14-day free trial.",
    headline: "Trust is everything in cleaning. Reviews are how you prove it.",
    subhead:
      "Homeowners hand strangers a key to their house. They check reviews carefully first. AutoFiveStar makes sure yours are answered, warm, and complete — without the owner spending Sunday night typing replies.",
    painPoints: [
      {
        title: "Recurring customers leave reviews; nobody responds; they cancel",
        body: "Cleaning is a relationship business. An unanswered five-star feels like the company doesn't care. AutoFiveStar replies the day the review posts.",
      },
      {
        title: "Eco / hypoallergenic claims are a legal trap",
        body: "Our cleaning template is tuned to avoid 'guaranteed hypoallergenic' and '100% bacteria-free' language. You stay compliant by default.",
      },
    ],
    sample: {
      reviewer: "Dana O.",
      rating: 5,
      body: "Maria and her team have been cleaning our home for two years. Always on time, always thorough, never any issues. Highly recommend.",
      response:
        "Thank you, Dana. Maria and the team think of you as family at this point. Two years means everything — looking forward to two more.",
    },
    faqs: [
      {
        q: "Can I send review requests after every cleaning?",
        a: "Yes. Set up a campaign that sends a request the day after each appointment, or download a QR code to leave on the kitchen counter.",
      },
      {
        q: "Will the AI mention my team members by name?",
        a: "Only when the customer mentions them first. The cleaning template defaults to first-name acknowledgment without inventing details.",
      },
      {
        q: "What about commercial accounts?",
        a: "Same product, same workflow. Pro plans support up to 10 locations, which is useful for commercial cleaners managing multiple Google profiles.",
      },
    ],
    closingLine:
      "Be the cleaning company every homeowner trusts on first glance.",
  },
} satisfies Record<string, IndustrySeo>;

export type IndustrySeoSlug = keyof typeof ENTRIES;

export const INDUSTRY_SEO_SLUGS = Object.keys(ENTRIES) as IndustrySeoSlug[];

export function getIndustrySeo(slug: string): IndustrySeo | null {
  if (Object.prototype.hasOwnProperty.call(ENTRIES, slug)) {
    return ENTRIES[slug as IndustrySeoSlug];
  }
  return null;
}

export function listIndustrySeo(): IndustrySeo[] {
  return INDUSTRY_SEO_SLUGS.map((s) => ENTRIES[s]);
}
