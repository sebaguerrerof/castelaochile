import "@/app/(public)/public-content.css";
import "@/app/(public)/public-design.css";
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };
export default function PreviewLayout({ children }: { children: React.ReactNode }) { return children; }
