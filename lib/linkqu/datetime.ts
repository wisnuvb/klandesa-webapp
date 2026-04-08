/**
 * Timestamp kadaluarsa LinkQu: yyyyMMddHHmmss Asia/Jakarta (WIB)
 */
export function getLinkquExpiredMinutesFromNow(minutes = 10): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() + minutes);
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = f.formatToParts(d);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}${get("month")}${get("day")}${get("hour")}${get("minute")}${get("second")}`;
}
