import chalk from "chalk";
import { type GradualApi, GradualApi as GradualApiClass } from "./api.js";
import { getCredentials, getProjectContext } from "./config.js";

interface AuthContext {
  token: string;
  dashboardUrl: string;
  api: GradualApi;
}

interface ProjectCtx {
  organizationSlug: string;
  organizationId: string;
  projectSlug: string;
  projectId: string;
}

export function requireAuth(): AuthContext {
  const creds = getCredentials();
  if (!creds) {
    console.error(chalk.red("Not logged in. Run `gradual login` first."));
    process.exit(1);
  }

  if (new Date(creds.expiresAt) < new Date()) {
    console.error(
      chalk.red("Session expired. Run `gradual login` to re-authenticate.")
    );
    process.exit(1);
  }

  const api = new GradualApiClass(creds.dashboardUrl, creds.token);
  return { token: creds.token, dashboardUrl: creds.dashboardUrl, api };
}

export function requireProject(): ProjectCtx {
  const ctx = getProjectContext();
  if (
    !(
      ctx?.organizationSlug &&
      ctx?.organizationId &&
      ctx?.projectSlug &&
      ctx?.projectId
    )
  ) {
    console.error(
      chalk.red("No project context set. Run `gradual init` first.")
    );
    process.exit(1);
  }

  return {
    organizationSlug: ctx.organizationSlug,
    organizationId: ctx.organizationId,
    projectSlug: ctx.projectSlug,
    projectId: ctx.projectId,
  };
}
