import { AdminPanel } from "@/components/admin/admin-ui";
export default function CareLoading(){return <AdminPanel title="Cargando seguimiento"><p role="status">Comprobando tu acceso y cargando registros autorizados…</p><div className="admin-skeleton" aria-hidden="true" style={{height:120}}/></AdminPanel>;}
