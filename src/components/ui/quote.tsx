import { cn } from "@/lib/utils";

type QuoteProps = React.ComponentProps<"blockquote"> & { cite?: string };

/** Human phrase set in the manual's quote face. `cite` names the source, never invented. */
export function Quote({ cite, className, children, ...props }: QuoteProps) {
  return (
    <blockquote className={cn("ds-quote", className)} {...props}>
      {children}
      {cite && <cite className="ds-quote__cite">{cite}</cite>}
    </blockquote>
  );
}
