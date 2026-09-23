import Link from "next/link";

import { Container } from "@/components/layout/container";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <Container className="flex min-h-[60vh] flex-col items-start justify-center py-20">
      <p className="font-nav text-xs font-bold uppercase tracking-[0.16em] text-primary">Error 404</p>
      <h1 className="mt-3 font-heading text-4xl font-bold tracking-[-0.04em] text-foreground">
        Esta página no está disponible
      </h1>
      <p className="mt-4 max-w-xl text-muted-foreground">
        Puedes volver al inicio para conocer la información institucional de Instituto Castelao Chile.
      </p>
      <Link className={buttonVariants({ className: "mt-7" })} href="/">
        Volver al inicio
      </Link>
    </Container>
  );
}
