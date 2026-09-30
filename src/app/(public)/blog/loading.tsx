import { Container } from "@/components/layout/container";

export default function BlogLoading() {
  return <>
    <section className="blog-hero blog-hero--skeleton"><Container><span className="blog-skeleton blog-skeleton--eyebrow" /><span className="blog-skeleton blog-skeleton--title" /><span className="blog-skeleton blog-skeleton--copy" /></Container></section>
    <Container className="blog-page" role="status"><span className="sr-only">Cargando artículos</span><div className="blog-skeleton blog-skeleton--search" /><div className="blog-grid">{Array.from({ length: 6 }, (_, index) => <div aria-hidden="true" className="content-post-card content-post-card--skeleton" key={index}><span className="blog-skeleton blog-skeleton--image" /><span className="blog-skeleton blog-skeleton--line-short" /><span className="blog-skeleton blog-skeleton--line" /><span className="blog-skeleton blog-skeleton--line" /><span className="blog-skeleton blog-skeleton--line-short" /></div>)}</div></Container>
  </>;
}
