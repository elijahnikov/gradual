import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Conf from "conf";

interface Credentials {
  token: string;
  expiresAt: string;
  dashboardUrl: string;
}

interface ProjectContext {
  organizationSlug: string;
  organizationId: string;
  projectSlug: string;
  projectId: string;
  dashboardUrl: string;
}

const credentialsStore = new Conf<Credentials>({
  projectName: "gradual",
  configName: "credentials",
  projectSuffix: "",
});

const configStore = new Conf<ProjectContext>({
  projectName: "gradual",
  configName: "config",
  projectSuffix: "",
});

const DEFAULT_DASHBOARD_URL = "https://app.gradual.so";

function readLocalConfig(): Partial<ProjectContext> | null {
  try {
    const content = readFileSync(
      resolve(process.cwd(), ".gradual.json"),
      "utf-8"
    );
    return JSON.parse(content) as Partial<ProjectContext>;
  } catch {
    return null;
  }
}

export function getCredentials(): Credentials | null {
  const token = credentialsStore.get("token");
  const expiresAt = credentialsStore.get("expiresAt");
  const dashboardUrl = credentialsStore.get("dashboardUrl");
  if (!(token && expiresAt && dashboardUrl)) {
    return null;
  }
  return { token, expiresAt, dashboardUrl };
}

export function setCredentials(creds: Credentials): void {
  credentialsStore.set("token", creds.token);
  credentialsStore.set("expiresAt", creds.expiresAt);
  credentialsStore.set("dashboardUrl", creds.dashboardUrl);
}

export function clearCredentials(): void {
  credentialsStore.clear();
}

export function getProjectContext(): ProjectContext | null {
  const local = readLocalConfig();
  const global = {
    organizationSlug: configStore.get("organizationSlug"),
    organizationId: configStore.get("organizationId"),
    projectSlug: configStore.get("projectSlug"),
    projectId: configStore.get("projectId"),
    dashboardUrl: configStore.get("dashboardUrl"),
  };

  const merged = {
    organizationSlug: local?.organizationSlug ?? global.organizationSlug,
    organizationId: local?.organizationId ?? global.organizationId,
    projectSlug: local?.projectSlug ?? global.projectSlug,
    projectId: local?.projectId ?? global.projectId,
    dashboardUrl: local?.dashboardUrl ?? global.dashboardUrl,
  };

  if (!(merged.organizationSlug && merged.projectSlug)) {
    return null;
  }

  return merged as ProjectContext;
}

export function setProjectContext(ctx: ProjectContext): void {
  configStore.set("organizationSlug", ctx.organizationSlug);
  configStore.set("organizationId", ctx.organizationId);
  configStore.set("projectSlug", ctx.projectSlug);
  configStore.set("projectId", ctx.projectId);
  configStore.set("dashboardUrl", ctx.dashboardUrl);
}

export function getDashboardUrl(): string {
  return (
    getCredentials()?.dashboardUrl ??
    configStore.get("dashboardUrl") ??
    DEFAULT_DASHBOARD_URL
  );
}
