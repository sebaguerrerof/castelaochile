import "server-only";
import { forbidden } from "next/navigation";
import { requireLibraryStaff } from "./server";
import type { LibraryCapability } from "@/types/patient-library";
export async function requireLibraryStaffPage(cap: LibraryCapability) {
  try {return await requireLibraryStaff(cap);} catch {forbidden();}
}
