export function isLocalEditorialReview(flag: string | undefined, deployment: string | undefined, host: string): boolean {
  return flag === "true" && !["production", "preview"].includes(deployment ?? "") && /^(?:localhost|127\.0\.0\.1)(?::\d+)?$/.test(host);
}
