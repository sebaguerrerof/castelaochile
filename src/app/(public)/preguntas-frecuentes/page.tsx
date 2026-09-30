import { CmsRoute, cmsMetadata } from "@/components/cms/cms-page";

export const generateMetadata = () => cmsMetadata("preguntas-frecuentes");
export default function Page() { return <CmsRoute slug="preguntas-frecuentes" />; }
