import { CircleCheck, UserRound, Users, UsersRound } from "lucide-react";
import { AdminDialogActions, AdminFormDialog } from "@/components/admin/admin-form-dialog";
import { AdminActionForm } from "@/components/admin/admin-action-form";
import { AdminSubmitButton } from "@/components/admin/admin-submit-button";
import { AdminNotice, MetricCard, PageHeader, StatePanel } from "@/components/admin/admin-ui";
import { requireLibraryStaffPage } from "@/lib/patient-library/admin-page";
import { manageLibraryAction } from "../library-actions";

function GroupForm({ group }: { group?: { id: string; name: string; description: string; is_active: boolean } }) {
  return <AdminActionForm action={manageLibraryAction} className="admin-form">
    <input name="op" value="group" type="hidden"/><input name="id" value={group?.id ?? ""} type="hidden"/>
    <label>Nombre<input name="name" defaultValue={group?.name} required minLength={2} maxLength={100} placeholder="Nombre del grupo"/></label>
    <label>{group ? "Descripción" : "Descripción no clínica"}<textarea name="description" defaultValue={group?.description} maxLength={300} rows={3} placeholder="Una breve descripción para identificar el grupo"/></label>
    <label className="admin-inline-check"><input type="checkbox" name="is_active" defaultChecked={group?.is_active ?? true}/> {group ? "Grupo activo" : "Activo"}</label>
    <AdminDialogActions><AdminSubmitButton>{group ? "Guardar grupo" : "Crear grupo"}</AdminSubmitButton></AdminDialogActions>
  </AdminActionForm>;
}

export default async function TherapyGroupsPage({ searchParams }: { searchParams: Promise<{ guardado?: string }> }) {
  const {client} = await requireLibraryStaffPage("access");
  const [{data:groups,error},{data:patients},{data:members},params] = await Promise.all([
    client.from("therapy_groups").select("*").order("name"),
    client.from("patient_profiles").select("id,display_name,is_active").order("display_name").limit(500),
    client.from("therapy_group_memberships").select("*").limit(1000),
    searchParams,
  ]);
  if(error) throw new Error("No fue posible cargar los grupos.");
  const activeMembers = members?.filter(member => member.is_active) ?? [];
  return <>
    <PageHeader title="Grupos terapéuticos" eyebrow="Centro y pacientes" description="Organiza los grupos, sus integrantes y el acceso a sus materiales en un solo lugar." actions={
      <AdminFormDialog title="Crear grupo" description="Define el nombre y una descripción breve. Después podrás agregar a sus pacientes." triggerLabel="Nuevo grupo" variant="primary"><GroupForm/></AdminFormDialog>
    }/>
    {params.guardado === "1" && <AdminNotice>Los cambios del grupo se guardaron correctamente.</AdminNotice>}
    <div className="admin-metric-grid admin-group-metrics">
      <MetricCard label="Grupos del centro" value={groups?.length ?? 0} detail="Activos e inactivos" icon={UsersRound}/>
      <MetricCard label="Grupos activos" value={groups?.filter(group => group.is_active).length ?? 0} detail="Disponibles para organizar el acceso" icon={CircleCheck}/>
      <MetricCard label="Membresías activas" value={activeMembers.length} detail="Hasta 1.000 membresías; un paciente puede integrar varios grupos" icon={UserRound}/>
    </div>
    <p className="admin-section-caption">La membresía activa concede acceso al historial publicado del grupo. Al salir, se pierde ese acceso.</p>
    <div className="admin-group-grid">{groups?.map(group => {
      const groupMembers = activeMembers.filter(member => member.group_id === group.id);
      return <article className="admin-panel admin-group-card" key={group.id}>
        <header className="admin-group-card-header"><span className="admin-card-symbol" aria-hidden="true"><Users size={23}/></span><div><h2>{group.name}</h2><span className="admin-status" data-status={group.is_active ? "active" : "inactive"}>{group.is_active ? "Activo" : "Inactivo"}</span></div></header>
        <p className="admin-group-description">{group.description || "Sin descripción"}</p>
        <div className="admin-group-section-heading"><h3>Integrantes</h3><span className="admin-count-badge" aria-label={groupMembers.length + " integrantes activos"}>{groupMembers.length}</span></div>
        {groupMembers.length ? <ul className="admin-member-list">{groupMembers.map(member => <li key={member.patient_id}><div className="admin-member-identity"><span className="admin-avatar" aria-hidden="true"><UserRound size={17}/></span><strong>{patients?.find(patient => patient.id === member.patient_id)?.display_name ?? "Paciente"}</strong></div>
          <AdminActionForm action={manageLibraryAction} className="admin-form"><input name="op" value="membership" type="hidden"/><input name="patient_id" value={member.patient_id} type="hidden"/><input name="group_id" value={group.id} type="hidden"/><AdminSubmitButton variant="secondary">Retirar del grupo</AdminSubmitButton></AdminActionForm>
        </li>)}</ul> : <p className="admin-group-empty"><UserRound size={18} aria-hidden="true"/>Este grupo todavía no tiene integrantes activos.</p>}
        <footer className="admin-group-card-actions">
          <AdminFormDialog key={group.name + "-" + group.is_active} title={"Editar grupo · " + group.name} triggerLabel="Editar grupo"><GroupForm group={group}/></AdminFormDialog>
          <AdminFormDialog title={"Agregar paciente · " + group.name} description="Selecciona un paciente con acceso activo para agregarlo o reactivar su membresía." triggerLabel="Agregar paciente"><AdminActionForm action={manageLibraryAction} className="admin-form">
            <input name="op" value="membership" type="hidden"/><input name="group_id" value={group.id} type="hidden"/>
            <label>Paciente<select name="patient_id" required><option value="">Seleccionar</option>{patients?.filter(patient => patient.is_active).map(patient => <option key={patient.id} value={patient.id}>{patient.display_name}</option>)}</select></label><input name="is_active" value="on" type="hidden"/>
            <AdminDialogActions><AdminSubmitButton>Agregar / reactivar membresía</AdminSubmitButton></AdminDialogActions>
          </AdminActionForm></AdminFormDialog>
        </footer>
      </article>;
    })}</div>
    {!groups?.length && <StatePanel icon={Users} title="Todavía no hay grupos" description="Usa Nuevo grupo para crear el primero. Luego agrega sus pacientes y organiza el acceso a los materiales."/>}
  </>;
}
