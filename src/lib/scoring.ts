/**
 * Deterministic scoring shared by the client game loop and the server
 * validator. The server recomputes the score from the reported food count,
 * so a tampered score value is simply ignored.
 */

export const POINTS_BASE = 10;
export const POINTS_STEP = 2;
export const POINTS_CAP = 50;
/** Foods needed before each speed/points step up. */
export const FOODS_PER_LEVEL = 5;

export function pointsForFood(n: number): number {
  // n is 1-indexed
  return Math.min(POINTS_CAP, POINTS_BASE + POINTS_STEP * Math.floor((n - 1) / FOODS_PER_LEVEL));
}

export function scoreForFoods(foods: number): number {
  let total = 0;
  for (let i = 1; i <= foods; i++) total += pointsForFood(i);
  return total;
}

/** Tick interval (ms) after `foods` eaten — classic gradual speed-up. */
export function tickMsForFoods(foods: number): number {
  const level = Math.floor(foods / FOODS_PER_LEVEL);
  return Math.max(70, 150 - level * 6);
}

export const MIN_MS_PER_FOOD = 110;
export const MAX_FOODS = 900;
