import { z } from "zod";

const count = z.number().int().nonnegative();
export const webAnalyticsSchema = z.object({
  visitors: count, previousVisitors: count, todayVisitors: count, totalViews: count, previousViews: count,
  latest: z.string().nullable(), startedAt: z.string().nullable(), startDate: z.string(), today: z.string(),
  dailyPoints: z.array(z.object({ date: z.string(), value: count, visitors: count })),
  topPages: z.array(z.object({ path: z.string(), pageViews: count })),
});
export type WebAnalytics = z.infer<typeof webAnalyticsSchema>;

/** Only compare fully observed periods; zeros before activation are not measured traffic. */
export function analyticsVariation(result: WebAnalytics, days: number) {
  if (!result.startedAt || result.previousVisitors === 0) return null;
  const previousStart = new Date(`${result.startDate}T00:00:00Z`);
  previousStart.setUTCDate(previousStart.getUTCDate() - days);
  const measuredFrom = new Date(result.startedAt).toLocaleDateString("en-CA", { timeZone: "America/Santiago" });
  if (measuredFrom >= previousStart.toISOString().slice(0, 10)) return null;
  return (result.visitors - result.previousVisitors) / result.previousVisitors * 100;
}
