import { notFound, permanentRedirect } from "next/navigation";
import { CmsPageView, cmsPageMetadata } from "@/components/cms/cms-page";
import { getCmsPageByPath, getCmsRedirect } from "@/lib/cms/repository";
import { isCmsPath } from "@/lib/cms/routing";

type Props = { params: Promise<{ cmsPath: string[] }> };
async function resolve(props: Props) {
  const path = "/" + (await props.params).cmsPath.join("/");
  if (!isCmsPath(path)) notFound();
  return { path, page: await getCmsPageByPath(path) };
}
export async function generateMetadata(props: Props) { return cmsPageMetadata((await resolve(props)).page); }
export default async function CmsDynamicRoute(props: Props) {
  const { path, page } = await resolve(props);
  if (!page) { const target = await getCmsRedirect(path); if (target) permanentRedirect(target); notFound(); }
  return <CmsPageView page={page} />;
}
