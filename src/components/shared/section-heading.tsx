import { cn } from "@/lib/utils";
import { EditorialParagraphs } from "./editorial-paragraphs";

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  subtitle?: string;
  showTitle?: boolean;
  align?: "left" | "center";
  inverted?: boolean;
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  subtitle,
  showTitle = true,
  align = "left",
  inverted = false,
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "max-w-3xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      {eyebrow ? (
        <p
          className={cn(
            "eyebrow mb-3",
            inverted ? "text-primary-foreground/80" : "text-primary",
          )}
        >
          {eyebrow}
        </p>
      ) : null}
      {showTitle && <h2
        className={cn(
          "font-heading text-3xl font-bold tracking-[-0.04em] sm:text-4xl lg:text-5xl",
          inverted ? "text-primary-foreground" : "text-foreground",
        )}
      >
        {title}
      </h2>}
      {subtitle && <p className="section-subtitle">{subtitle}</p>}
      {description ? (
        <EditorialParagraphs
          text={description}
          className={cn(
            "section-description mt-5 text-base leading-7 sm:text-lg",
            inverted ? "text-primary-foreground/80" : "text-muted-foreground",
          )}
        />
      ) : null}
    </div>
  );
}
