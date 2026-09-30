import { CmsRoute, cmsMetadata } from "@/components/cms/cms-page";
import { LegacyHashRedirect } from "@/components/home/legacy-hash-redirect";

export const generateMetadata = () => cmsMetadata("inicio");
export default function Page() { return <><LegacyHashRedirect /><CmsRoute slug="inicio" /></>; }
