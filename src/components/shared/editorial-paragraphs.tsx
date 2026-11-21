export function EditorialParagraphs({ text, className }: { text: string; className?: string }) {
  const paragraphs = text.split(/\n\s*\n/).map(paragraph => paragraph.trim()).filter(Boolean);
  if (!paragraphs.length) return null;
  return <div className={className}>{paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>;
}
