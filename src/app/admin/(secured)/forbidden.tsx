import Link from "next/link";

export default function AdminForbidden() {
  return (
    <main className="admin-runtime-unavailable">
      <p className="eyebrow">403</p>
      <h1>Tu cuenta no tiene permisos para esta sección.</h1>
      <p>Solicita a una persona superadministradora que revise o active tu rol.</p>
      <Link href="/admin/login">Volver al acceso</Link>
    </main>
  );
}
