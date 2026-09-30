import { CmsRoute, cmsMetadata } from "@/components/cms/cms-page";

export const generateMetadata = () => cmsMetadata("familias");
export default function Page() { return <CmsRoute slug="familias" />; }
