import { CmsRoute, cmsMetadata } from "@/components/cms/cms-page";

export const generateMetadata = () => cmsMetadata("contacto");
export default function Page() { return <CmsRoute slug="contacto" />; }
