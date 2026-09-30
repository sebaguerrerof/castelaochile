import { NextResponse } from "next/server";

import { canReadContentMedia } from "@/lib/repositories/content-repository";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const safeObjectPath = /^(?:[a-zA-Z0-9_-]+\/){1,5}[a-zA-Z0-9._-]+$/;

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  const path = segments.join("/");
  if (!safeObjectPath.test(path) || !await canReadContentMedia(path)) return new NextResponse(null, { status: 404 });
  try {
    const { data, error } = await createAdminSupabaseClient().storage.from("content-images").createSignedUrl(path, 300);
    if (error || !data.signedUrl) return new NextResponse(null, { status: 404 });
    return NextResponse.redirect(data.signedUrl, { status: 302, headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
