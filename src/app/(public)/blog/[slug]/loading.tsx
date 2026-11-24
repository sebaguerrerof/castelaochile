import { Container } from "@/components/layout/container";

export default function ArticleLoading() {
  return <article className="article" aria-busy="true"><header className="article-hero"><Container className="article-hero__content"><span className="blog-skeleton blog-skeleton--line-short" /><span className="blog-skeleton blog-skeleton--title" /><span className="blog-skeleton blog-skeleton--copy" /></Container></header><Container className="article__container" role="status"><span className="sr-only">Cargando artículo</span><div className="article-body">{Array.from({ length: 7 }, (_, index) => <span className="blog-skeleton blog-skeleton--line" key={index} />)}</div></Container></article>;
}
