import { PersonalAutonomyPage } from "@/components/care/personal-autonomy-page";
export default async function Page({params, searchParams}: {params: Promise<{id: string}>; searchParams: Promise<{evaluacion?: string; revision?: string; inicial?: string; editar?: string; version?: string}>}) {
  return <PersonalAutonomyPage pid={(await params).id} query={await searchParams}/>;
}
