// ISO 3166-1 alpha-2 codes — stable, standardized data that essentially
// never changes, so hardcoding the codes is safe. Display *names* are
// still resolved at runtime via Intl.DisplayNames rather than hardcoded,
// so labels stay correct/localized without us maintaining them.
//
// (Deliberately not using Intl.supportedValuesOf("region"): that key was
// only recently added to the Enumeration API and throws a RangeError on
// browsers that don't yet support it, which would take down this whole
// page — confirmed against the Chromium build used for local testing.)
const COUNTRY_CODES = [
  "AF","AL","DZ","AS","AD","AO","AI","AQ","AG","AR","AM","AW","AU","AT","AZ",
  "BS","BH","BD","BB","BY","BE","BZ","BJ","BM","BT","BO","BA","BW","BR","BN",
  "BG","BF","BI","KH","CM","CA","CV","KY","CF","TD","CL","CN","CO","KM","CG",
  "CD","CK","CR","CI","HR","CU","CW","CY","CZ","DK","DJ","DM","DO","EC","EG",
  "SV","GQ","ER","EE","SZ","ET","FK","FO","FJ","FI","FR","GF","PF","GA","GM",
  "GE","DE","GH","GI","GR","GL","GD","GP","GU","GT","GG","GN","GW","GY","HT",
  "HN","HK","HU","IS","IN","ID","IR","IQ","IE","IM","IL","IT","JM","JP","JE",
  "JO","KZ","KE","KI","KP","KR","KW","KG","LA","LV","LB","LS","LR","LY","LI",
  "LT","LU","MO","MG","MW","MY","MV","ML","MT","MH","MQ","MR","MU","YT","MX",
  "FM","MD","MC","MN","ME","MS","MA","MZ","MM","NA","NR","NP","NL","NC","NZ",
  "NI","NE","NG","NU","NF","MK","MP","NO","OM","PK","PW","PS","PA","PG","PY",
  "PE","PH","PN","PL","PT","PR","QA","RE","RO","RU","RW","WS","SM","ST","SA",
  "SN","RS","SC","SL","SG","SX","SK","SI","SB","SO","ZA","SS","ES","LK","BL",
  "SH","KN","LC","MF","PM","VC","SD","SR","SE","CH","SY","TW","TJ","TZ","TH",
  "TL","TG","TK","TO","TT","TN","TR","TM","TC","TV","UG","UA","AE","GB","US",
  "UY","UZ","VU","VA","VE","VN","VG","VI","WF","EH","YE","ZM","ZW",
] as const;

let cache: { code: string; name: string }[] | null = null;

export function listCountries(): { code: string; name: string }[] {
  if (cache) return cache;
  try {
    const display = new Intl.DisplayNames(["en"], { type: "region" });
    cache = COUNTRY_CODES.map((code) => ({ code, name: display.of(code) ?? code })).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  } catch {
    cache = COUNTRY_CODES.map((code) => ({ code, name: code }));
  }
  return cache;
}

export function countryName(code: string | null | undefined): string | null {
  if (!code) return null;
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** Regional-indicator flag emoji for a 2-letter ISO code (e.g. "IN" -> 🇮🇳). */
function flagFromCode(code: string): string {
  return [...code.toUpperCase()].map((c) => String.fromCodePoint(127397 + c.charCodeAt(0))).join("");
}

/**
 * Flag emoji for a country as it's actually stored — a display name like
 * "India", not a code — resolved by reverse-matching against the same
 * code/name list the country picker uses. Returns null (never a wrong or
 * placeholder flag) if the name doesn't match anything real.
 */
export function flagForCountryName(name: string | null | undefined): string | null {
  if (!name) return null;
  const match = listCountries().find((c) => c.name === name);
  return match ? flagFromCode(match.code) : null;
}
