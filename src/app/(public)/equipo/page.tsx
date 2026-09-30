import { CmsRoute, cmsMetadata } from "@/components/cms/cms-page";

export const generateMetadata = () => cmsMetadata("equipo");
export default function Page() { return <CmsRoute slug="equipo" />; }
