import { NextResponse } from "next/server";

import { getPublishedPost } from "@/lib/repositories/content-repository";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ kind: string; slug: string }> }) {
  const { kind, slug } = await params;
  if ((kind !== "blog" && kind !== "news") || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return new NextResponse(null, { status: 404 });
  const post = await getPublishedPost(kind, slug);
  if (!post?.coverImagePath) return new NextResponse(null, { status: 404 });
  try {
    const { data, error } = await createAdminSupabaseClient().storage.from("content-images").createSignedUrl(post.coverImagePath, 60);
    if (error || !data.signedUrl) return new NextResponse(null, { status: 404 });
    return NextResponse.redirect(data.signedUrl, { status: 302, headers: { "Cache-Control": "private, no-store" } });
  } catch { return new NextResponse(null, { status: 404 }); }
}
