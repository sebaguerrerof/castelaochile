import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EyeMark } from "@/components/ui/eye-mark";
import { Photo } from "@/components/ui/photo";
import { Notice } from "@/components/ui/notice";
import { Quote } from "@/components/ui/quote";
import { TextLink } from "@/components/ui/text-link";
import { assets } from "@/config/assets";

export const metadata: Metadata = { title: "Sistema de diseño", robots: { index: false, follow: false } };

const colors = [
  ["--brand-blue", "Azul corporativo"], ["--brand-orange", "Naranja corporativo (acento)"], ["--brand-gray", "Gris corporativo"],
  ["--brand-blue-deep", "Azul profundo (solo hover y fondos oscuros)"], ["--ink", "Tinta"], ["--ink-soft", "Tinta suave"],
  ["--mist", "Niebla"], ["--canvas", "Lienzo"], ["--line", "Línea"],
] as const;
const sizes = [["--text-display", "Display"], ["--text-3xl", "3xl"], ["--text-2xl", "2xl"], ["--text-xl", "xl"], ["--text-lg", "lg"], ["--text-md", "md"], ["--text-base", "base"], ["--text-sm", "sm"], ["--text-xs", "xs"]] as const;

/** Development-only review page. It is hidden in production builds. */
export default function DesignSystemPage() {
  if (process.env.NODE_ENV === "production") notFound();
  const { horizontal, vertical } = assets.brand;
  return <main className="design-system" id="main-content"><Container>
    <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "var(--text-3xl)", lineHeight: "var(--leading-tight)", margin: "var(--space-7) 0 var(--space-5)" }}>Sistema de diseño</h1>
    <p style={{ maxWidth: "var(--measure)", lineHeight: "var(--leading-body)" }}>Página de revisión interna. Solo existe en desarrollo. Todo se toma de <code>src/styles/tokens.css</code>.</p>

    <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "var(--text-xl)", margin: "var(--space-8) 0 var(--space-4)" }}>Color</h2>
    <div style={{ display: "grid", gap: "var(--space-4)", gridTemplateColumns: "repeat(auto-fill, minmax(10rem, 1fr))" }}>
      {colors.map(([token, label]) => <div key={token}>
        <div style={{ background: `var(${token})`, border: "1px solid var(--border)", borderRadius: "var(--radius)", height: "4rem" }} />
        <p style={{ fontSize: "var(--text-sm)", margin: "var(--space-2) 0 0" }}><strong>{label}</strong><br /><code>{token}</code></p>
      </div>)}
    </div>

    <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "var(--text-xl)", margin: "var(--space-8) 0 var(--space-4)" }}>Tipografía</h2>
    {sizes.map(([token, label]) => <p key={token} style={{ fontFamily: "var(--font-heading)", fontSize: `var(${token})`, lineHeight: "var(--leading-heading)", margin: "0 0 var(--space-3)" }}>{label} · Recuperar tu vida es posible</p>)}
    <Quote cite="Frase con la tipografía de citas (Volkhov)">Recuperarse es mucho más que dejar de consumir.</Quote>

    <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "var(--text-xl)", margin: "var(--space-8) 0 var(--space-4)" }}>Acciones</h2>
    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-4)", alignItems: "center" }}>
      <Button>Solicitar evaluación terapéutica</Button><Button variant="secondary">Conoce nuestros tratamientos</Button><Button variant="outline">Hablar con nuestro equipo</Button>
      <TextLink href="/equipo">Conocer perfil</TextLink>
    </div>

    <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "var(--text-xl)", margin: "var(--space-8) 0 var(--space-4)" }}>Tarjetas, avisos y marcador</h2>
    <div style={{ display: "grid", gap: "var(--space-5)", gridTemplateColumns: "repeat(auto-fit, minmax(16rem, 1fr))" }}>
      <Card><h3 style={{ margin: 0 }}>Tarjeta</h3><p>Borde y fondo, sin sombra.</p></Card>
      <Card variant="soft"><h3 style={{ margin: 0 }}>Tarjeta suave</h3><p>Superficie teñida, sin borde.</p></Card>
    </div>
    <div style={{ display: "grid", gap: "var(--space-4)", marginTop: "var(--space-5)" }}>
      <Notice title="Información">Aviso informativo con borde completo, tinte e icono.</Notice>
      <Notice tone="warning" title="Proyecto en desarrollo">Recovery 90 aún no recibe participantes.</Notice>
    </div>
    <ul style={{ listStyle: "none", margin: "var(--space-5) 0 0", padding: 0, display: "grid", gap: "var(--space-3)" }}>
      {["Reconocimiento de la dependencia", "Abstinencia", "Responsabilidad personal"].map((item) => <li key={item} style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}><EyeMark />{item}</li>)}
    </ul>

    <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "var(--text-xl)", margin: "var(--space-8) 0 var(--space-4)" }}>Fotografía</h2>
    <div style={{ maxWidth: "36rem" }}>
      <Photo alt={assets.images.hero.alt} caption="Sala luminosa del Instituto" height={assets.images.hero.height} sizes="(max-width: 768px) 100vw, 36rem" src={assets.images.hero.src} width={assets.images.hero.width} />
    </div>

    <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "var(--text-xl)", margin: "var(--space-8) 0 var(--space-4)" }}>Logotipos</h2>
    <div style={{ display: "grid", gap: "var(--space-6)", gridTemplateColumns: "repeat(auto-fit, minmax(18rem, 1fr))", paddingBottom: "var(--space-9)" }}>
      <Card><Image alt={vertical.alt} height={vertical.height} src={vertical.src} style={{ height: "auto", width: "22rem", maxWidth: "100%" }} width={vertical.width} /></Card>
      <Card variant="soft"><Image alt={horizontal.alt} height={horizontal.height} src={horizontal.src} style={{ height: "auto", width: "20rem", maxWidth: "100%" }} width={horizontal.width} /></Card>
    </div>
  </Container></main>;
}
