/** Exact isolated endpoints only; cannot enable the local limiter against a remote project. */
export function isCareLocalQa(env:Record<string,string|undefined>=process.env) {
  return env.CARE_LOCAL_QA==="true" && env.NEXT_PUBLIC_SUPABASE_URL==="http://127.0.0.1:54421"
    && env.NEXT_PUBLIC_SITE_URL==="http://localhost:3450";
}
