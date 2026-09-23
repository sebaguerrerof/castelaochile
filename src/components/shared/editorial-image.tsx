import Image from "next/image";

import type { LocalImageAsset } from "@/config/assets";
import { cn } from "@/lib/utils";

type EditorialImageProps = {
  asset: LocalImageAsset;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  sizes: string;
  tone?: "default" | "hero";
};

/** A single image treatment keeps crops, hover states and loading behavior aligned. */
export function EditorialImage({
  asset,
  className,
  imageClassName,
  priority = false,
  sizes,
  tone = "default",
}: EditorialImageProps) {
  return (
    <div className={cn("editorial-image", tone === "hero" && "editorial-image--hero", className)}>
      <Image
        alt={asset.alt}
        className={cn("editorial-image__image", imageClassName)}
        fill
        priority={priority}
        sizes={sizes}
        src={asset.src}
        style={{ objectPosition: asset.objectPosition }}
      />
    </div>
  );
}
