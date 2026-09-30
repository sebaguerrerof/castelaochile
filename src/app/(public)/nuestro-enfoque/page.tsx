import { CmsRoute, cmsMetadata } from "@/components/cms/cms-page";

export const generateMetadata = () => cmsMetadata("nuestro-metodo");
export default function Page() { return <CmsRoute slug="nuestro-metodo" />; }
