export const TOTAL_STEPS = 4;
export const LAST_STEP_INDEX = 3;

export function formatFormErrors(errors: unknown[]): string {
  return errors
    .map((error) => {
      if (typeof error === "string") {
        return error;
      }
      if (error && typeof error === "object" && "message" in error) {
        return String(error.message);
      }
      return String(error);
    })
    .join(", ");
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const SLUG_REGEX = /^[a-z0-9-]+$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
