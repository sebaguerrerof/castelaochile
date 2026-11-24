import { cn } from "@/lib/utils";

type CardProps = React.ComponentProps<"div"> & {
  /** `soft` is a tinted surface without a border. Cards are never nested. */
  variant?: "plain" | "soft";
};

export function Card({ variant = "plain", className, ...props }: CardProps) {
  return <div className={cn("ds-card", variant === "soft" && "ds-card--soft", className)} {...props} />;
}
