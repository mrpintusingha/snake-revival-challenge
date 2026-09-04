/**
 * Central product configuration.
 * Timings, wording and feature flags all live here so they can be changed in
 * one place (legal review, copy experiments). The game itself is free — see
 * the comment on startAttempt in api.functions.ts.
 */

/** Longest a single official attempt may last before the session is void. */
export const MAX_SESSION_DURATION_MS = 30 * 60 * 1000;
/** Challenge links stay alive for a long time so WhatsApp shares keep working. */
export const CHALLENGE_EXPIRY_DAYS = 365;

/** Simple MVP feature flags — no experimentation platform needed. */
export const FEATURE_FLAGS = {
  showLiveActivity: true,
  showPlayingNow: true,
  showFriendsLeaderboard: true,
  showShareCard: true,
} as const;

/** All brand / nostalgia wording. Editable without touching components. */
export const BRAND = {
  name: "90s Nokia Snake Challenge",
  short: "90s Kids",
  tagline1: "Bring back your childhood memories.",
  tagline2: "Can you still beat your friends?",
  supporting:
    "The classic mobile Snake experience, rebuilt as a global challenge for the 90s generation.",
  cta: "PLAY FREE",
  eraWording: "Nokia-era Snake",
  disclaimer: "Not affiliated with or endorsed by Nokia.",
  legal:
    "Free to play. No cash prizes, no prize pool, no payouts, no betting. Sponsor rankings are paid advertising placements, not a prize competition.",
} as const;

/** Sponsor ladder: a standalone, always-on paid ranking. Not tied to game weeks or scores. */
export const SPONSOR_CATEGORIES = [
  "AI Agents & Infrastructure",
  "SEO & AI Visibility",
  "Marketing & Advertising",
  "Crypto, Web3 & Investing",
  "Developer Tools",
  "Business, Finance & Legal",
  "Security, Privacy & Compliance",
  "Health, Fitness & Wellness",
  "Social Media & Creator Tools",
  "Leaderboards & Attention Markets",
  "Hiring, Jobs & Careers",
  "Education & Learning",
  "Agencies, Studios & Services",
  "Ecommerce & Retail",
  "Domains & Web Assets",
  "Games & Entertainment",
  "People & Profiles",
  "Productivity & Personal Tools",
  "Design & Creative",
  "Writing & Content",
  "Directories, Launch & Discovery",
  "AI Media Generation",
  "Audio, Voice & Podcasting",
  "Sales & Lead Generation",
  "Travel, Local & Lifestyle",
  "Real Estate & Property",
  "Media & News",
  "Other",
] as const;

/** Minimum amount, in whole dollars, a new claim must exceed the current top by. */
export const SPONSOR_MIN_INCREMENT = 1;

export const GAME_VERSION = "1.0.0";

export const SITE_URL =
  (typeof window !== "undefined" && window.location.origin) || "https://90skids.lol";

/** Who operates this site — used on Contact, Terms, Privacy and the footer. */
export const OPERATOR = {
  name: "Pintu Singha",
  email: "mrpintusingha@gmail.com",
  twitterHandle: "@itspintusingha",
  twitterUrl: "https://x.com/itspintusingha",
} as const;

export const ACHIEVEMENT_TIERS = [
  { min: 10000, name: "90s Final Boss" },
  { min: 5000, name: "Snake Legend" },
  { min: 3000, name: "Snake Master" },
  { min: 1500, name: "Snake Player" },
  { min: 500, name: "Nokia Kid" },
  { min: 0, name: "Snake Rookie" },
] as const;

export function tierFor(score: number): string {
  return ACHIEVEMENT_TIERS.find((t) => score >= t.min)!.name;
}
