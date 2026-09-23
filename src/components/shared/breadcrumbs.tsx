import Link from "next/link";

type BreadcrumbsProps = {
  current: string;
};

export function Breadcrumbs({ current }: BreadcrumbsProps) {
  return (
    <nav aria-label="Migas de pan" className="breadcrumbs">
      <ol>
        <li><Link href="/">Inicio</Link></li>
        <li aria-hidden="true">/</li>
        <li aria-current="page">{current}</li>
      </ol>
    </nav>
  );
}