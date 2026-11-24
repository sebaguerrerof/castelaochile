import Image from "next/image";

import { assets } from "@/config/assets";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  priority?: boolean;
  placement?: "header" | "footer";
  /** `vertical` is the primary logo; `horizontal` is the secondary one (admin). */
  variant?: "horizontal" | "vertical" | "verticalNegative";
};

/**
 * Renders the logo extracted from the brand manual. It deliberately does not
 * rebuild the wordmark with web fonts and never stretches the image: only the
 * width is set in CSS, so the aspect ratio is preserved.
 */
export function BrandLogo({
  className,
  priority = false,
  placement = "header",
  variant = "horizontal",
}: BrandLogoProps) {
  const logo = assets.brand[variant];
  const shape = variant === "verticalNegative" ? "vertical" : variant;

  return (
    <span className={cn("brand-logo", `brand-logo--${placement}`, `brand-logo--${shape}`, className)}>
      <Image
        alt={logo.alt}
        className="brand-logo__asset"
        height={logo.height}
        preload={priority}
        sizes={shape === "vertical" ? "(max-width: 640px) 80vw, 352px" : placement === "header" ? "(max-width: 640px) 190px, 236px" : "210px"}
        src={logo.src}
        width={logo.width}
      />
      {variant === "horizontal" && <span className="brand-logo__territory">Chile</span>}
    </span>
  );
}
