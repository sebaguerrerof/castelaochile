import { cn } from "@/lib/utils";

/** The logo's eye as a small decorative marker. It carries no information. */
export function EyeMark({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("ds-eye", className)} />;
}
