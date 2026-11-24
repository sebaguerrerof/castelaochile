export function AdminRuntimeUnavailable() {
  return (
    <main className="admin-runtime-unavailable">
      <p className="eyebrow">Configuración pendiente</p>
      <h1>El panel requiere un proyecto Supabase autorizado</h1>
      <p>La interfaz no usa usuarios ni métricas de ejemplo. Configura las variables de Supabase y aplica las migraciones a un entorno identificado antes de iniciar sesión.</p>
    </main>
  );
}
