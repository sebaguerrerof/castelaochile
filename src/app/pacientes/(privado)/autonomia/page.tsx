import { PersonalAutonomyPage } from "@/components/care/personal-autonomy-page";
export default async function Page({searchParams}: {searchParams: Promise<{evaluacion?: string; revision?: string; inicial?: string; editar?: string; version?: string}>}) {
  return <PersonalAutonomyPage query={await searchParams}/>;
}
