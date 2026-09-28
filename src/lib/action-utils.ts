export type ActionResult = { ok: true } | { ok: false; error: string };

export function actionError(error: unknown): ActionResult {
  const message =
    error instanceof Error ? error.message : "Something went wrong";
  return { ok: false, error: message };
}

export function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function formOptionalString(formData: FormData, key: string): string | null {
  const value = formString(formData, key);
  return value === "" ? null : value;
}

export function formNumber(formData: FormData, key: string): number {
  const raw = formString(formData, key);
  const n = Number(raw);
  return Number.isFinite(n) ? n : NaN;
}

export function formInt(formData: FormData, key: string): number {
  return Math.trunc(formNumber(formData, key));
}

export function formBool(formData: FormData, key: string): boolean {
  const value = formData.get(key);
  return value === "on" || value === "true" || value === "1";
}
