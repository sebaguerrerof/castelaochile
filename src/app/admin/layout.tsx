import type { Metadata } from "next";

import "./(secured)/admin.css";
import "./admin-auth-design.css";

export const metadata: Metadata = { robots: { index: false, follow: false, nocache: true } };

/** /admin has no dependency on the public header, footer or WhatsApp shell. */
export default function AdminRouteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
