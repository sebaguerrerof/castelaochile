"use client";
import Link from "next/link";
export default function LibraryError({reset}:{reset:()=>void}) {return <section className="library-empty"><h1>No fue posible cargar esta sección</h1><p>Espera unos momentos y vuelve a intentarlo.</p><button className="library-button" onClick={reset}>Reintentar</button><p><Link href="/pacientes" prefetch={false}>Volver al inicio</Link></p></section>;}
