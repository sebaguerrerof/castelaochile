"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { Container } from "@/components/layout/container";

export default function BlogError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Blog route failed", error);
  }, [error]);

  return <Container className="blog-error" role="alert">
    <AlertTriangle aria-hidden="true" size={32} />
    <p className="eyebrow">Blog / Noticias</p>
    <h1>No pudimos cargar el contenido</h1>
    <p>Puede tratarse de un problema temporal. Intenta nuevamente o vuelve al inicio.</p>
    <div>
      <button onClick={reset} type="button"><RefreshCw aria-hidden="true" size={16} /> Reintentar</button>
      <Link href="/">Volver al inicio</Link>
    </div>
  </Container>;
}
