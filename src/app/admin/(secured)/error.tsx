"use client";

export default function AdminError({ reset }: { reset: () => void }) {
  return <section className="admin-panel"><h1>No fue posible cargar esta sección</h1><p>La información no se ha reemplazado por datos de demostración. Revisa la configuración y vuelve a intentarlo.</p><button onClick={reset} type="button">Reintentar</button></section>;
}
