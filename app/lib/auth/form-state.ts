export type FormState = {
  status: "idle" | "success" | "error";
  message: string;
  redirectTo?: string;
};

export const initialFormState: FormState = { status: "idle", message: "" };
