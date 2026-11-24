import Image, { type ImageProps } from "next/image";

import { cn } from "@/lib/utils";

type PhotoProps = Pick<ImageProps, "src" | "alt" | "width" | "height" | "sizes" | "priority" | "unoptimized"> & {
  caption?: string;
  className?: string;
};

/** Real photograph with rounded corners and an optional caption. Alt text is required. */
export function Photo({ alt, caption, className, ...image }: PhotoProps) {
  return (
    <figure className={cn("ds-photo", className)}>
      <Image alt={alt} className="ds-photo__image" {...image} />
      {caption && <figcaption className="ds-photo__caption">{caption}</figcaption>}
    </figure>
  );
}
