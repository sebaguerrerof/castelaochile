import { institutionalIcon } from "@/lib/pwa/icon";

export function generateImageMetadata() {
  return [192, 512].map(size => ({ id: String(size), size: { width: size, height: size }, contentType: "image/png" }));
}

export default async function Icon({ id }: { id: Promise<string> }) {
  return institutionalIcon(Number(await id));
}
