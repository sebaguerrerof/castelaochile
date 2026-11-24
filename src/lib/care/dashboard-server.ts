import "server-only";
import { forbidden } from "next/navigation";
import { requireCare,getCareCapabilities } from "./server";
export async function requireDashboard(){const context=await requireCare("care.directory.read");const caps=await getCareCapabilities();if(!caps.includes("care.patient.read")||!caps.includes("care.records.read"))forbidden();return {...context,caps};}
