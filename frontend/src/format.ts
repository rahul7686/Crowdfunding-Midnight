// Midnight's native token is NIGHT, whose smallest unit is STAR:
// 1 NIGHT = 10^6 STAR (6 decimal places).
export const NIGHT_DECIMAL_PLACES = 6;
export const NIGHT_DECIMALS = 10n ** BigInt(NIGHT_DECIMAL_PLACES);

export const formatTNight = (n: bigint): string =>
  (n / NIGHT_DECIMALS).toLocaleString("en-US");

/** Parses a decimal tNIGHT string ("10", "10.5") into base units, or null if invalid. */
export const parseTNight = (input: string): bigint | null => {
  const trimmed = input.trim();
  if (trimmed === "" || !/^\d*\.?\d*$/.test(trimmed)) return null;
  const [whole, frac = ""] = trimmed.split(".");
  const wholeBig = BigInt(whole === "" ? "0" : whole);
  const padded = frac.padEnd(NIGHT_DECIMAL_PLACES, "0").slice(0, NIGHT_DECIMAL_PLACES);
  return wholeBig * NIGHT_DECIMALS + BigInt(padded === "" ? "0" : padded);
};
