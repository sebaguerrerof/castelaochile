/** Deterministic SSR/client labels, independent of host timezone and ICU month names. */
export function formatChileDate(value: string, withTime = false) {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit", ...(withTime ? { hour: "2-digit", minute: "2-digit", hourCycle: "h23" as const } : {}) }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("day")}-${part("month")}-${part("year")}${withTime ? ` ${part("hour")}:${part("minute")}` : ""}`;
}
