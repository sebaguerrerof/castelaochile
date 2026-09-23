import Image from "next/image";

import { assets } from "@/config/assets";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  priority?: boolean;
  placement?: "header" | "footer";
};

/**
 * Uses the derived manual preview asset only. It deliberately does not rebuild
 * the wordmark with web fonts; replace this source when the master brand files
 * arrive.
 */
export function BrandLogo({
  className,
  priority = false,
  placement = "header",
}: BrandLogoProps) {
  const logo = assets.brand.horizontal;

  return (
    <span className={cn("brand-logo", `brand-logo--${placement}`, className)}>
      <Image
        alt={logo.alt}
        className="brand-logo__asset"
        height={logo.height}
        priority={priority}
        sizes={placement === "header" ? "(max-width: 640px) 190px, 236px" : "210px"}
        src={logo.src}
        width={logo.width}
      />
      <span className="brand-logo__territory">Chile</span>
    </span>
  );
}
