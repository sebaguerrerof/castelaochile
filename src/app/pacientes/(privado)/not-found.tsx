import Link from "next/link";
export default function PatientNotFound(){return <section className="library-empty"><h1>Recurso no disponible</h1><p>Vuelve a tu biblioteca para consultar los materiales disponibles para ti.</p><Link href="/pacientes/biblioteca" prefetch={false}>Ir a mi biblioteca</Link></section>;}
