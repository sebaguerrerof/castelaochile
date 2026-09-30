import { notFound } from "next/navigation";
import { getProfessional } from "@/lib/cms/repository";
import { ProfessionalProfile } from "@/components/cms/professional-profile";
import { createPageMetadata } from "@/lib/page-metadata";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
 const { slug } = await params; const person = await getProfessional(slug);
 if (!person) return { title: "Perfil no disponible", robots: { index: false } };
 const metadata = createPageMetadata({ title: person.seo_title || person.full_name, description: person.seo_description || person.short_bio, path: `/equipo/${person.slug}` });
 return { ...metadata, openGraph: { ...metadata.openGraph, ...(person.profile_image_url ? { images: [person.profile_image_url] } : {}) } };
}
export default async function ProfilePage({ params }: { params: Promise<{ slug: string }> }) {
 const { slug } = await params; const person = await getProfessional(slug); if (!person) notFound();
 return <ProfessionalProfile person={person} />;
}
