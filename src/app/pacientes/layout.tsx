import type { Metadata } from "next";
import "./portal.css";
import "@/app/(public)/public-content.css";
import "@/components/care/care.css";

export const dynamic="force-dynamic";
export const revalidate=0;
export const metadata:Metadata={title:"Espacio de pacientes",robots:{index:false,follow:false,nocache:true},alternates:{canonical:null},openGraph:{title:"Espacio privado",description:"Instituto Castelao Chile",url:undefined}};
export default function PatientLayout({children}:{children:React.ReactNode}) {return children;}
