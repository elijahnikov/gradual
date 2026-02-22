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
