export function readStringField(
  formData: FormData,
  fieldName: string,
): string | null {
  const value = formData.get(fieldName);
  return typeof value === "string" ? value : null;
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string): boolean {
  return (
    value.length >= 3 &&
    value.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  );
}

export function isValidFullName(value: string): boolean {
  const name = value.trim();
  return name.length >= 2 && name.length <= 100;
}

export function isValidNewPassword(value: string): boolean {
  return value.length >= 8 && value.length <= 128;
}

export function isValidCompanyName(value: string): boolean {
  const name = value.trim();
  return name.length >= 2 && name.length <= 200;
}