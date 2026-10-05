import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacidad de la analítica | Instituto Castelao Chile" };

export default function AnalyticsPrivacyPage() {
  return <article className="analytics-privacy container">
    <p className="eyebrow">Privacidad y transparencia</p>
    <h1>Cómo medimos las visitas</h1>
    <p>Instituto Castelao Chile utiliza analítica propia para conocer cuántos navegadores visitan este sitio y qué páginas se consultan. La medición solo comienza si eliges «Aceptar analítica» en las preferencias de privacidad.</p>
    <h2>Qué se guarda</h2>
    <p>Una cookie con un identificador aleatorio permite reconocer el mismo navegador durante 180 días. Otra cookie conserva tu elección durante ese plazo. Cada vista consentida registra la ruta de la página, la fecha y un identificador del navegador transformado mediante un hash. No guardamos direcciones IP, el texto de los formularios, términos de búsqueda ni los parámetros de las direcciones web en la analítica.</p>
    <h2>Cuánto tiempo se conserva</h2>
    <p>Los registros que permiten distinguir navegadores se eliminan automáticamente de forma diaria una vez fuera de la ventana de 180 días. Los totales por página y día, que no contienen identificadores, se conservan para consultar la evolución del sitio. Las cifras se procesan en Supabase y están disponibles únicamente en el administrador privado.</p>
    <h2>Cómo rechazar o retirar tu permiso</h2>
    <p>Rechazar no limita el acceso al sitio. Puedes cambiar tu elección desde «Preferencias de privacidad», al pie de cualquier página pública. Al rechazar, se elimina la cookie identificadora y se detiene la captura futura; las estadísticas ya registradas se conservan durante los plazos indicados. La cookie que recuerda tu rechazo permanece para evitar preguntarte en cada visita.</p>
    <p>Respetamos las señales «Do Not Track» y «Global Privacy Control» del navegador: con ellas activas no registramos visitas, incluso si previamente aceptaste la analítica.</p>
    <h2>Qué significan las cifras</h2>
    <p>Un navegador único no equivale necesariamente a una persona. Cambiar de dispositivo, borrar cookies o usar navegación privada puede generar otro identificador. Los visitantes que rechazan la analítica no aparecen en las cifras. No utilizamos estos datos para publicidad ni para asociar las visitas a una cuenta o a una consulta de contacto.</p>
    <Link className="public-text-link" href="/">Volver al inicio</Link>
  </article>;
}
