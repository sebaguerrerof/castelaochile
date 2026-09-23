import { cn } from "@/lib/utils";

import { Container } from "./container";

type SectionProps = React.ComponentProps<"section"> & {
  containerClassName?: string;
};

export function Section({
  className,
  containerClassName,
  children,
  ...props
}: SectionProps) {
  return (
    <section className={cn("py-[var(--section-space)]", className)} {...props}>
      <Container className={containerClassName}>{children}</Container>
    </section>
  );
}
