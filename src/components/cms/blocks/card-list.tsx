import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { EditorialParagraphs } from "@/components/shared/editorial-paragraphs";
import { EyeMark } from "@/components/ui/eye-mark";
import { showsCardIndex } from "@/lib/cms/presentation";
import type { CmsBlock } from "@/lib/cms/schemas";

type CardBlock = Extract<CmsBlock, { section_type: "feature_cards" | "principles" | "steps" }>;
type Item = CardBlock["data"]["items"][number];

function Body({ item, Heading }: { item: Item; Heading: "h2" | "h3" }) {
  return <>
    <Heading>{item.title}</Heading>
    {item.subtitle && <p className="cms-item__subtitle">{item.subtitle}</p>}
    <EditorialParagraphs text={item.description} className="cms-item__description" />
  </>;
}

/**
 * Principles, steps and feature cards share one data shape but not one layout:
 * principles are a marked list, steps are numbered, and feature cards are either
 * links (cards) or plain rows. Cards are never used as the default container.
 */
export function CardList({ block }: { block: CardBlock }) {
  const Heading = block.data.showTitle === false ? "h2" : "h3";
  const items = block.data.items;

  if (block.section_type === "principles") {
    return <ul className="cms-principles" data-count={items.length}>{items.map((item, index) => <li key={index}><EyeMark /><div><Body Heading={Heading} item={item} /></div></li>)}</ul>;
  }
  if (block.section_type === "steps") {
    return <ol className="cms-steps" data-count={items.length}>{items.map((item, index) => <li key={index}>{showsCardIndex("steps") && <span aria-hidden="true" className="cms-steps__number">{index + 1}</span>}<div><Body Heading={Heading} item={item} /></div></li>)}</ol>;
  }
  if (items.every((item) => item.href)) {
    return <div className="cms-link-cards" data-count={items.length}>{items.map((item, index) => <Link className="ds-card cms-link-card" href={item.href!} key={index}>
      <Body Heading={Heading} item={item} />
      <span className="cms-link-card__action">{item.linkLabel}<ArrowUpRight aria-hidden="true" size={18} /></span>
    </Link>)}</div>;
  }
  return <ul className="cms-rows" data-count={items.length}>{items.map((item, index) => <li key={index}>
    <Body Heading={Heading} item={item} />
    {item.href && <Link className="ds-text-link" href={item.href}>{item.linkLabel || "Ver más"}<ArrowUpRight aria-hidden="true" size={16} /></Link>}
  </li>)}</ul>;
}
