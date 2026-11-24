export function adminReturnPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.includes("\\")) return "/admin";
  try {
    const url = new URL(value, "https://castelao.invalid");
    if (url.origin !== "https://castelao.invalid" || !/^\/admin(?:\/|$)/.test(url.pathname) || /^\/admin\/(?:login|activar)(?:\/|$)/.test(url.pathname)) return "/admin";
    return url.pathname + url.search;
  } catch { return "/admin"; }
}
