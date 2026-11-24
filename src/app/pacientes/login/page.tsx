import { BrandLogo } from "@/components/shared/brand-logo";
import { PatientLoginForm } from "@/components/patient-library/patient-forms";
import { portalEnabled } from "@/lib/patient-library/server";
import { hasSupabasePublicConfig } from "@/lib/supabase/config";
import { careEnabled } from "@/lib/care/server";

export default async function PatientLoginPage({searchParams}:{searchParams:Promise<{reason?:string;estado?:string}>}) {
  const {reason,estado}=await searchParams;
  const invalidLink=reason==="invite-invalid";
  const care=careEnabled();
  return <main className="patient-auth"><section><BrandLogo priority/><p className="library-eyebrow">Tu espacio de acompañamiento</p><h1>{care?"Bienvenido a tu espacio":"Bienvenido a tu biblioteca"}</h1><p>{care?"Planifica tu semana, completa tus reportes y revisa tus compromisos y materiales compartidos.":"Accede a las guías, actividades y materiales que el equipo ha preparado para ti."}</p>
    {invalidLink && <p className="library-notice" role="alert">El enlace no es válido, venció o ya se utilizó. Solicita uno nuevo en Recuperar acceso o contacta al equipo del Instituto.</p>}
    {estado==="acceso" && !invalidLink && <p className="library-notice" role="status">Inicia sesión para continuar. Si tu acceso está suspendido o todavía no fue habilitado, contacta al equipo del Instituto.</p>}
    {portalEnabled() && hasSupabasePublicConfig() ? <PatientLoginForm recoveryInitiallyOpen={invalidLink} careEnabled={care}/> : <p className="library-notice">El acceso al portal todavía no está habilitado. Contacta al equipo del Instituto para recibir orientación.</p>}
    <p className="patient-auth-note">El acceso es personal y por invitación del Instituto.</p></section></main>;
}
