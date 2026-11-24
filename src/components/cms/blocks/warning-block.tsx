import { Section } from "@/components/layout/section";
import { EditorialParagraphs } from "@/components/shared/editorial-paragraphs";
import { Notice } from "@/components/ui/notice";
import type { BlockData } from "@/lib/cms/schemas";

/** Status or safety message (for example "Recovery 90 is under development"). */
export function WarningBlock({ data }: { data: BlockData<"warning"> }) {
  return <Section className="cms-warning"><Notice title={data.title} tone="warning"><EditorialParagraphs text={data.description} /></Notice></Section>;
}
