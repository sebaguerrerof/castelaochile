"use client";

import { StatePanel } from "@/components/admin/admin-ui";

export default function AdminError({ reset }: { reset: () => void }) {
  return <StatePanel action={<button className="admin-button admin-button-primary" onClick={reset} type="button">Reintentar</button>} description="La información no se reemplazó por datos de demostración. Revisa la conexión y vuelve a intentarlo." title="No fue posible cargar esta sección" tone="error" />;
}
