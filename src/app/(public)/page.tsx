import { CmsRoute, cmsMetadata } from "@/components/cms/cms-page";
import { LegacyHashRedirect } from "@/components/home/legacy-hash-redirect";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCmsPage } from "@/lib/cms/repository";
import { isLocalEditorialReview } from "@/lib/cms/local-review";

export const generateMetadata = () => cmsMetadata("inicio");
export default async function Page() {
  if (process.env.CMS_EDITORIAL_LOCAL_REVIEW === "true") {
    if (isLocalEditorialReview(process.env.CMS_EDITORIAL_LOCAL_REVIEW, process.env.VERCEL_ENV, (await headers()).get("host") ?? "")) {
      const home = await getCmsPage("inicio");
      if (home) redirect(`/admin/vista-previa/paginas/${home.id}`);
    }
  }
  return <><LegacyHashRedirect /><CmsRoute slug="inicio" requestedPath="/" /></>;
}
