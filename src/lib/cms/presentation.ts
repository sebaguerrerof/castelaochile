/**
 * Pure presentation rules for CMS blocks. They decide what the public page shows
 * without changing the stored content, so the editor keeps every field.
 */

const normalize = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toLowerCase();

/**
 * The hero label is shown only when it adds information. A label that merely repeats
 * the brand name (every published hero does) is hidden; a status such as
 * "Proyecto en desarrollo" stays visible.
 */
export function visibleEyebrow(eyebrow: string | undefined, brandName: string): string | null {
  const text = eyebrow?.trim();
  if (!text) return null;
  return normalize(text) === normalize(brandName) ? null : text;
}

/** Card numbering is kept only where the order carries meaning. */
export function showsCardIndex(sectionType: "feature_cards" | "principles" | "steps"): boolean {
  return sectionType === "steps";
}

export type TextVariant = "lead" | "statement" | "split" | "panel";

type TextBlockLike = { id: string; section_type: string; data: { showTitle?: boolean } };

/**
 * Text blocks all share one data shape, so their look is decided by position:
 * the untitled text that opens a page (right after the hero, or after a status
 * notice that follows it) is the introduction; an untitled text right after it is a
 * closing statement; titled texts then alternate between a split layout and a panel
 * so consecutive blocks never look the same.
 */
export function textVariants(blocks: readonly TextBlockLike[]): Map<string, TextVariant> {
  const variants = new Map<string, TextVariant>();
  let opening = true;
  let afterIntro = false;
  let titled = 0;
  for (const block of blocks) {
    if (block.section_type === "hero" || block.section_type === "warning") continue;
    if (block.section_type !== "rich_text") { opening = false; afterIntro = false; continue; }
    const untitled = block.data.showTitle === false;
    if (opening && untitled) { variants.set(block.id, "lead"); afterIntro = true; }
    else if (afterIntro && untitled) variants.set(block.id, "statement");
    else { variants.set(block.id, titled++ % 2 === 0 ? "split" : "panel"); afterIntro = false; }
    opening = false;
  }
  return variants;
}
