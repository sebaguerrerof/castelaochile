"use client";
import { useActionState } from "react";
import Link from "next/link";
import { patientFavorite, patientLogin, patientPassword, patientRecovery } from "@/app/pacientes/actions";

const initial={message:"",ok:false};
export function PatientLoginForm({recoveryInitiallyOpen=false,careEnabled=false}:{recoveryInitiallyOpen?:boolean;careEnabled?:boolean}) {
  const [state,action,pending]=useActionState(patientLogin,initial);
  const [recovery,recover,recovering]=useActionState(patientRecovery,initial);
  return <><form action={action} className="library-form">
    <label>Correo electrónico<input autoComplete="username" name="email" required type="email" maxLength={254}/></label>
    <label>Contraseña<input autoComplete="current-password" name="password" required type="password" maxLength={200}/></label>
    <button disabled={pending} className="library-button">{pending ? "Entrando…" : careEnabled?"Entrar a mi espacio":"Entrar a mi biblioteca"}</button>
    {state.message && <p role="alert">{state.message}</p>}
  </form><details className="library-recovery" open={recoveryInitiallyOpen || undefined}><summary>Recuperar acceso</summary><form action={recover} className="library-form">
    <label>Correo de tu cuenta<input autoComplete="email" name="email" required type="email"/></label>
    <button className="library-button library-button--secondary" disabled={recovering}>Enviar instrucciones</button>
    {recovery.message && <p role="status">{recovery.message}</p>}
  </form></details></>;
}
export function PatientPasswordForm() {
  const [state,action,pending]=useActionState(patientPassword,initial);
  if(state.ok) return <div className="library-form"><p role="status">{state.message}</p><Link className="library-button" href="/pacientes" prefetch={false}>Entrar a mi portal</Link></div>;
  return <form action={action} className="library-form"><label>Nueva contraseña<input autoComplete="new-password" minLength={12} maxLength={128} required type="password" name="password"/></label>
    <label>Confirmar contraseña<input autoComplete="new-password" required type="password" name="confirmation" minLength={12} maxLength={128}/></label>
    <button className="library-button" disabled={pending}>Guardar contraseña</button>
    {state.message && <p role={state.ok ? "status" : "alert"}>{state.message}</p>}</form>;
}
export function FavoriteButton({id,favorite}:{id:string;favorite:boolean}) {
  const [state,action,pending]=useActionState(patientFavorite,initial);
  return <form action={action}><input name="id" value={id} type="hidden"/><input name="favorite" value={String(!favorite)} type="hidden"/>
    <button className="library-favorite" aria-pressed={favorite} disabled={pending}>{favorite ? "★ Quitar favorito" : "☆ Guardar favorito"}</button>
    {state.message && <small className="library-favorite-feedback" role="status">{state.message}</small>}</form>;
}
