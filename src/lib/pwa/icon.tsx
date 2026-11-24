import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { assets } from "@/config/assets";

export async function institutionalIcon(size: number) {
  const brand = assets.brand.horizontal;
  const png = await readFile(path.join(process.cwd(), "public", brand.src));
  // Preserve the supplied institutional wordmark, including its proportions.
  const width = size * 0.84;
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "white", border: `${Math.round(size * 0.04)}px solid #0079BE` }}>
      {/* ImageResponse renders the original bytes; next/image is not supported here. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`data:image/png;base64,${png.toString("base64")}`} alt={brand.alt} width={width} height={width * brand.height / brand.width} />
    </div>,
    { width: size, height: size },
  );
}
