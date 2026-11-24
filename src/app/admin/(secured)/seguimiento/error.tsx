"use client";
import { StatePanel } from "@/components/admin/admin-ui";
import { PageHeader } from "@/components/admin/admin-ui";
import Link from "next/link";
export default function CareError({reset}:{reset:()=>void}){return <><PageHeader title="No fue posible cargar seguimiento" description="Actualiza esta sección o vuelve al panel para continuar."/><StatePanel tone="error" title="Recuperar la consulta" description="Revisa la conexión y vuelve a intentarlo." action={<div className="care-nav"><button type="button" className="admin-button admin-button-secondary" onClick={reset}>Reintentar</button><Link href="/admin/seguimiento" prefetch={false}>Volver al panel</Link></div>}/></>;}
