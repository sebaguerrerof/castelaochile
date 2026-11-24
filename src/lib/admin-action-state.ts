export type AdminActionState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export type AdminFormAction = (
  previousState: AdminActionState,
  formData: FormData,
) => Promise<AdminActionState>;
