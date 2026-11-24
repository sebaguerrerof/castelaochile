"use client";
import { Children, cloneElement, createContext, useActionState, useContext, useEffect, useId, useRef } from "react";
import { AdminSubmitButton } from "@/components/admin/admin-submit-button";
import { useRouter } from "next/navigation";
export type CareFormState={status:"idle"|"success"|"error";message?:string;fieldErrors?:Record<string,string[]>;savedAt?:number;nextPath?:string};
type Action=(_:CareFormState,form:FormData)=>Promise<CareFormState>;
const Errors=createContext<Record<string,string[]>>({});
export function useCareErrors(name:string){return useContext(Errors)[name];}
export function CareErrors({name,id}:{name:string;id:string}){const errors=useCareErrors(name);return errors?<p role="alert" className="admin-form-error" id={id}>{errors.join(" ")}</p>:<span id={id}/>;}
export function CareForm({action,children,label,confirm,disabled=false,submitVariant="primary"}:{action:Action;children:React.ReactNode;label:string;confirm?:string;disabled?:boolean;submitVariant?:"primary"|"secondary"|"danger"}) {
  const allowReset=useRef(false);
  // React resets uncontrolled controls when an action resolves, even if its
  // returned domain state says error. Permit that reset only after a saved result.
  const safeAction:Action=async(previous,data)=>{allowReset.current=false;try{const result=await action(previous,data);allowReset.current=result.status==="success";return result;}catch{return {status:"error",message:"No pudimos confirmar el guardado. Conserva tus cambios y vuelve a intentar."};}};
  const [state,formAction,pending]=useActionState(safeAction,{status:"idle"});
  const router=useRouter();
  const dirty=useRef(false);const form=useRef<HTMLFormElement>(null);
  useEffect(()=>{
    const guard=(e:BeforeUnloadEvent)=>{if(dirty.current)e.preventDefault();};
    const linkGuard=(e:MouseEvent)=>{const link=(e.target as Element).closest('a[href]');if(dirty.current&&link&&!link.getAttribute('href')?.startsWith('#')&&!window.confirm('Tienes cambios sin guardar. ¿Salir de esta pantalla?')){e.preventDefault();e.stopPropagation();}};
    window.addEventListener("beforeunload",guard);document.addEventListener('click',linkGuard,true);
    return()=>{window.removeEventListener("beforeunload",guard);document.removeEventListener('click',linkGuard,true);};
  },[]);
  useEffect(()=>{if(state.status==="success"){dirty.current=false;if(state.nextPath&&(state.nextPath.startsWith("/admin/seguimiento/pacientes/")||/^\/admin\/seguimiento\/informes\/[0-9a-f-]{36}$/.test(state.nextPath)))router.replace(state.nextPath);}if(state.status==="error"){const invalid=form.current?.querySelector<HTMLElement>('[aria-invalid="true"]');let parent=invalid?.parentElement;while(parent){if(parent instanceof HTMLDetailsElement)parent.open=true;parent=parent.parentElement;}invalid?.focus();}},[state,router]);
  useEffect(()=>{if(state.status==="success")form.current?.dispatchEvent(new CustomEvent("admin-form-saved",{bubbles:true}));},[state]);
  return <Errors value={state.fieldErrors??{}}><form ref={form} action={formAction} aria-busy={pending} className="admin-form care-form" onReset={e=>{if(!allowReset.current)e.preventDefault();}} onChange={()=>{dirty.current=true;}} onSubmit={e=>{if(confirm&&!window.confirm(confirm))e.preventDefault();}}>
    <fieldset disabled={pending||disabled}>{children}<AdminSubmitButton pendingLabel="Guardando…" variant={submitVariant}>{label}</AdminSubmitButton></fieldset>
    {state.message&&<p role={state.status==="error"?"alert":"status"} className={state.status==="error"?"admin-form-error":"admin-notice"}>{state.message}</p>}
  </form></Errors>;
}
export function CareField({name,label,children}:{name:string;label:string;children:React.ReactElement<{id?:string;name?:string;type?:string;"aria-invalid"?:boolean;"aria-describedby"?:string}>}) {
  const errors=useContext(Errors)[name];const id=useId();
  // React resolves streamed children through its public Children API before cloning.
  const inputs=Children.toArray(children);if(inputs.length!==1)throw new Error("CareField requiere un control único.");
  const input=Children.only(inputs[0]) as typeof children;const inputId=input.props.id??id+"-input";
  const control=cloneElement(input,{id:inputId,name,"aria-invalid":Boolean(errors),"aria-describedby":errors?id:input.props["aria-describedby"]});
  return <div className="care-field">{input.props.type==="checkbox"?<label className="care-check" htmlFor={inputId}>{control}<span>{label}</span></label>:<><label htmlFor={inputId}>{label}</label>{control}</>}{errors&&<p id={id} role="alert">{label}: {errors.join(" ")}</p>}</div>;
}
