import { Container } from "@/components/layout/container";

export default function ArticleLoading() {
  return <article className="article"><Container className="article__container" role="status"><span className="sr-only">Cargando artículo</span><header className="article-header"><span className="blog-skeleton blog-skeleton--line-short" /><span className="blog-skeleton blog-skeleton--title" /><span className="blog-skeleton blog-skeleton--copy" /></header><span className="blog-skeleton blog-skeleton--article-image" />{Array.from({ length: 7 }, (_, index) => <span className="blog-skeleton blog-skeleton--line" key={index} />)}</Container></article>;
}
