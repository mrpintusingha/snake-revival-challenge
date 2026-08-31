/**
 * Central product configuration.
 * Price and all Nokia-related wording live here so they can be changed in one
 * place (e.g. after legal review or during a pricing test).
 */

export const ENTRY_PRICE = 1.0;
export const ENTRY_CURRENCY = "USD";
export const ENTRY_ATTEMPTS = 3;

export const formatPrice = (amount: number = ENTRY_PRICE) =>
  amount % 1 === 0 ? `$${amount.toFixed(0)}` : `$${amount.toFixed(2)}`;

/** All brand / nostalgia wording. Editable without touching components. */
export const BRAND = {
  name: "90s Nokia Snake Challenge",
  short: "90s Snake",
  tagline1: "You played it as a kid.",
  tagline2: "Can you still beat your friends?",
  supporting:
    "The classic mobile Snake experience, rebuilt as a global challenge for the 90s generation.",
  cta: `ENTER THE CHALLENGE — ${formatPrice()}`,
  payCta: `PAY ${formatPrice()} & PLAY`,
  eraWording: "Nokia-era Snake",
  disclaimer: "Not affiliated with or endorsed by Nokia.",
  legal:
    "This is a paid game experience, not gambling. No cash prizes, no prize pool, no payouts, no betting. You pay to participate.",
} as const;

export const GAME_VERSION = "1.0.0";

export const SITE_URL =
  (typeof window !== "undefined" && window.location.origin) ||
  "https://90s-snake-challenge.lovable.app";

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
