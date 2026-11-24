import { AdminMaterialEditorPage } from "@/components/patient-library/admin-editor-page";
export default async function EditMaterialPage({params}:{params:Promise<{id:string}>}) {const {id}=await params;return <AdminMaterialEditorPage id={id}/>;}
