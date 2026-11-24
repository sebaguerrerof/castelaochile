"use client";

import { ArrowUpRight, Search, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

type Destination = { href: string; label: string; icon: LucideIcon };
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Searches the same authorized navigation as the sidebar; never queries clinical records. */
export function NavigationSearch({ items }: { items: Destination[] }) {
  const dialog = useRef<HTMLDialogElement>(null), trigger = useRef<HTMLButtonElement>(null), input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const titleId = useId();
  const matches = items.filter(item => normalize(item.label).includes(normalize(query.trim())));
  function show() { setQuery(""); dialog.current?.showModal(); input.current?.focus(); }
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "k" || event.altKey) return;
      if (document.querySelector("dialog[open]")) return;
      if ((document.activeElement as HTMLElement | null)?.closest('input, textarea, [contenteditable="true"]')) return;
      event.preventDefault(); trigger.current?.click();
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  return <div className="admin-navigation-search">
    <button ref={trigger} type="button" className="admin-search-trigger" aria-label="Buscar sección" aria-haspopup="dialog" onClick={show}>
      <Search size={20} aria-hidden="true"/><span>Buscar una sección</span><kbd>Ctrl K</kbd>
    </button>
    <dialog ref={dialog} className="admin-search-dialog" aria-labelledby={titleId} onClose={() => trigger.current?.focus()}
      onKeyDown={event=>{if(event.key==="Escape"){event.preventDefault();event.currentTarget.close();}}}
      onClick={event => { if(event.target===event.currentTarget) {const r=event.currentTarget.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)event.currentTarget.close();} }}>
      <header><h2 id={titleId}>Ir a una sección</h2><button type="button" className="admin-icon-button" aria-label="Cerrar búsqueda" onClick={() => dialog.current?.close()}><X size={20} aria-hidden="true"/></button></header>
      <label className="admin-search-input"><Search size={20} aria-hidden="true"/><span className="sr-only">Nombre de la sección</span><input ref={input} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Pacientes, biblioteca, agenda…" autoComplete="off"/></label>
      <div className="admin-search-results" aria-live="polite"><p>{query.trim() ? `${matches.length} secciones encontradas` : "Tus secciones disponibles"}</p>
        {matches.length ? <nav aria-label="Resultados de secciones">{matches.map(({href,label,icon:Icon}) => <Link key={href} href={href} prefetch={false} onClick={() => dialog.current?.close()}><span className="admin-search-result-icon"><Icon size={20} aria-hidden="true"/></span><span>{label}</span><ArrowUpRight size={17} aria-hidden="true"/></Link>)}</nav> : <div className="admin-search-empty"><Search size={26} aria-hidden="true"/><strong>Sin coincidencias</strong><span>Prueba con el nombre de otra sección.</span></div>}
      </div>
      <footer><span>Busca secciones del panel</span><span><kbd>Esc</kbd> para cerrar</span></footer>
    </dialog>
  </div>;
}
