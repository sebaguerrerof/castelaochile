import Image from "next/image";

import { assets } from "@/config/assets";
import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
  priority?: boolean;
  /** Shows the "Chile" territory label next to the name. */
  territory?: boolean;
};

/**
 * Compact identity for the navigation bar: the hand from the manual plus the
 * name written as text ("Instituto Castelao", manual p. 20). It is not the logo,
 * which is shown whole, unmodified, in the footer and the home page.
 */
export function BrandMark({ className, priority = false, territory = true }: BrandMarkProps) {
  const mark = assets.brand.mark;
  return (
    <span className={cn("ds-brand-mark", className)}>
      <Image alt="" className="ds-brand-mark__hand" height={mark.height} preload={priority} src={mark.src} width={mark.width} />
      <span className="ds-brand-mark__name">Instituto Castelao</span>
      {territory && <>{" "}<span className="ds-brand-mark__territory">Chile</span></>}
    </span>
  );
}
