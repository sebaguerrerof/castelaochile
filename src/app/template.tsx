import { PageTransition } from "@/components/motion/page-transition";

/**
 * Next.js gives templates a route-specific key, so this client boundary enters
 * again after every page navigation without remounting the root shell.
 */
export default function Template({ children }: Readonly<{ children: React.ReactNode }>) {
  return <PageTransition>{children}</PageTransition>;
}