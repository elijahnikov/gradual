export const ENVIRONMENT_COLORS = [
  { name: "Amber", value: "#FCD34D" },
  { name: "Mint", value: "#86EFAC" },
  { name: "Sky", value: "#7DD3FC" },
  { name: "Lavender", value: "#C4B5FD" },
  { name: "Peach", value: "#FDBA74" },
  { name: "Rose", value: "#FDA4AF" },
  { name: "Cyan", value: "#67E8F9" },
  { name: "Lime", value: "#BEF264" },
  { name: "Violet", value: "#A78BFA" },
  { name: "Pink", value: "#F9A8D4" },
  { name: "Teal", value: "#5EEAD4" },
  { name: "Indigo", value: "#A5B4FC" },
  { name: "Coral", value: "#FCA5A5" },
  { name: "Emerald", value: "#6EE7B7" },
  { name: "Fuchsia", value: "#E879F9" },
  { name: "Slate", value: "#94A3B8" },
] as const;

export type EnvironmentColor = (typeof ENVIRONMENT_COLORS)[number]["value"];

export function getRandomEnvironmentColor(): string {
  const index = Math.floor(Math.random() * ENVIRONMENT_COLORS.length);
  return ENVIRONMENT_COLORS[index]?.value ?? ENVIRONMENT_COLORS[0].value;
}

export function getEnvironmentColorByIndex(index: number): string {
  return (
    ENVIRONMENT_COLORS[index % ENVIRONMENT_COLORS.length]?.value ??
    ENVIRONMENT_COLORS[0].value
  );
}
