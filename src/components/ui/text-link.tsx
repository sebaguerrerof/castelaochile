import Link from "next/link";

import { cn } from "@/lib/utils";

type TextLinkProps = Omit<React.ComponentProps<"a">, "href"> & { href: string };

/** Quiet inline action. Internal paths use the router; anything else opens safely. */
export function TextLink({ href, className, children, ...props }: TextLinkProps) {
  const classes = cn("ds-text-link", className);
  if (href.startsWith("/")) {
    return <Link className={classes} href={href} {...props}>{children}</Link>;
  }
  return <a className={classes} href={href} rel="noopener noreferrer" target="_blank" {...props}>{children}</a>;
}
