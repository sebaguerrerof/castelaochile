import type { Json } from "./database";

export type LibraryCapability = "access" | "content" | "read";
export type LibraryPermissions = { manage_access: boolean; manage_content: boolean; read_content: boolean };
export type PatientProfile = { id: string; auth_user_id: string | null; email: string; display_name: string; is_active: boolean; invitation_state: "pending" | "sending" | "sent" | "failed" | "linked"; invitation_at: string | null; created_at: string; updated_at: string };
export type TherapyGroup = { id: string; name: string; description: string; is_active: boolean };
export type TherapyArea = { id: string; name: string; sort_order: number; is_active: boolean };
export type LibraryFolder = { id: string; area_id: string; parent_id: string | null; name: string; sort_order: number; is_active: boolean };
export type MaterialKind = "activity" | "guide" | "summary" | "report" | "exercise" | "other";
export type LibraryMaterial = { id: string; area_id: string; folder_id: string | null; title: string; description: string; kind: MaterialKind; body: string; tags: string[]; session_date: string | null; audience: "all" | "groups" | "patients"; status: "draft" | "published" | "archived"; author_id: string; version: number; created_at: string; updated_at: string };
export type LibraryAttachment = { id: string; material_id: string; object_key: string; original_name: string; mime: string; bytes: number; state: "pending" | "ready" | "failed" | "retired"; replaces_id: string | null; created_at: string };
export type LibrarySearchRow = Pick<LibraryMaterial, "id" | "title" | "description" | "kind" | "area_id" | "folder_id" | "session_date" | "updated_at" | "status" | "version"> & { favorite: boolean; is_new: boolean; total_count: number };
type Table<Row> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: [] };
export type PatientLibraryTables = {
  patient_profiles: Table<PatientProfile>;
  therapeutic_staff_permissions: Table<LibraryPermissions & { user_id: string; updated_at: string }>;
  therapy_groups: Table<TherapyGroup>;
  therapy_group_memberships: Table<{ group_id: string; patient_id: string; is_active: boolean }>;
  therapy_areas: Table<TherapyArea>;
  patient_library_folders: Table<LibraryFolder>;
  patient_library_materials: Table<LibraryMaterial>;
  patient_library_group_grants: Table<{ material_id: string; group_id: string }>;
  patient_library_patient_grants: Table<{ material_id: string; patient_id: string }>;
  patient_library_attachments: Table<LibraryAttachment>;
  patient_library_user_state: Table<{ patient_id: string; material_id: string; favorite: boolean; first_opened_at: string | null }>;
};
export type PatientLibraryFunctions = {
  library_manage: { Args: { op: string; p: Json }; Returns: Json };
  library_finish_attachment: { Args: { aid: string; ready: boolean; actor: string }; Returns: undefined };
  library_state: { Args: { mid: string; fav?: boolean | null; opened?: boolean }; Returns: undefined };
  library_search: { Args: { q?: string; area?: string; folder?: string; kind_filter?: string; date_from?: string; date_to?: string; favorites?: boolean; page?: number; staff?: boolean; status_filter?: string }; Returns: LibrarySearchRow[] };
  library_preview: { Args: { mid: string; pid: string }; Returns: Json };
  library_recipients: { Args: Record<never, never>; Returns: Json };
  library_patient_material: { Args: { mid: string }; Returns: Json };
  library_navigation: { Args: Record<never, never>; Returns: Json };
};
export type PatientMaterialDetail = { material: Pick<LibraryMaterial,"id"|"title"|"description"|"kind"|"body"|"tags"|"session_date"|"area_id"|"folder_id">; attachments: Pick<LibraryAttachment,"id"|"original_name"|"mime"|"bytes">[] };
export type PatientNavigation = { areas: TherapyArea[]; folders: LibraryFolder[] };
