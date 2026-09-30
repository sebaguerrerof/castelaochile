import { CmsRoute, cmsMetadata } from "@/components/cms/cms-page";

export const generateMetadata = () => cmsMetadata("tratamiento");
export default function Page() { return <CmsRoute slug="tratamiento" />; }
