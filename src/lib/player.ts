/** Lightweight, account-free player identity kept in localStorage. */

const SECRET_KEY = "snake90_player_secret";
const PROFILE_KEY = "snake90_profile_id";
const PENDING_CHALLENGE_KEY = "snake90_pending_challenge";

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export function getPlayerSecret(): string {
  if (typeof window === "undefined") return "";
  let s = localStorage.getItem(SECRET_KEY);
  if (!s) {
    s = uuid();
    localStorage.setItem(SECRET_KEY, s);
  }
  return s;
}

export function getStoredProfileId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PROFILE_KEY);
}

export function setStoredProfileId(id: string) {
  if (typeof window !== "undefined") localStorage.setItem(PROFILE_KEY, id);
}

export function setPendingChallenge(code: string | null) {
  if (typeof window === "undefined") return;
  if (code) localStorage.setItem(PENDING_CHALLENGE_KEY, code);
  else localStorage.removeItem(PENDING_CHALLENGE_KEY);
}

export function getPendingChallenge(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PENDING_CHALLENGE_KEY);
}
