import { CmsRoute, cmsMetadata } from "@/components/cms/cms-page";

export const generateMetadata = () => cmsMetadata("el-instituto");
export default function Page() { return <CmsRoute slug="el-instituto" />; }
