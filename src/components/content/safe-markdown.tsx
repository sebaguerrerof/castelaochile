import type { ReactNode } from "react";

function safeHref(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function inline(value: string): ReactNode[] {
  const tokens = value.split(/(\[[^\]]+\]\([^\s)]+\)|\*\*[^*]+\*\*|`[^`]+`)/g);
  return tokens.filter(Boolean).map((token, index) => {
    const link = /^\[([^\]]+)\]\(([^\s)]+)\)$/.exec(token);
    if (link) {
      const href = safeHref(link[2]);
      return href ? <a href={href} key={index} rel="noreferrer" target="_blank">{link[1]}</a> : link[1];
    }
    if (token.startsWith("**") && token.endsWith("**")) return <strong key={index}>{token.slice(2, -2)}</strong>;
    if (token.startsWith("`") && token.endsWith("`")) return <code key={index}>{token.slice(1, -1)}</code>;
    return token;
  });
}

/** Markdown subset: headings, paragraphs, lists, emphasis, code and http(s) links. Raw HTML is always rendered as text. */
export function SafeMarkdown({ value }: { value: string }) {
  const lines = value.replace(/\r\n?/g, "\n").split("\n");
  const nodes: ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length) {
      nodes.push(<ul key={`list-${nodes.length}`}>{listItems.map((item, index) => <li key={index}>{inline(item)}</li>)}</ul>);
      listItems = [];
    }
  };

  lines.forEach((line, index) => {
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    const listItem = /^[-*]\s+(.+)$/.exec(line);
    if (listItem) {
      listItems.push(listItem[1]);
      return;
    }
    flushList();
    if (!line.trim()) return;
    if (heading) {
      const Tag = heading[1].length === 1 ? "h2" : heading[1].length === 2 ? "h3" : "h4";
      nodes.push(<Tag key={`heading-${index}`}>{inline(heading[2])}</Tag>);
      return;
    }
    nodes.push(<p key={`paragraph-${index}`}>{inline(line)}</p>);
  });
  flushList();
  return <div className="article-body">{nodes}</div>;
}
