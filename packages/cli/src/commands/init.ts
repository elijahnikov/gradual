import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { confirm, select } from "@inquirer/prompts";
import { Command } from "commander";
import { setProjectContext } from "../lib/config.js";
import { requireAuth } from "../lib/middleware.js";
import { error, success } from "../lib/output.js";

interface OrganizationResult {
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  projects: {
    id: string;
    name: string;
    slug: string;
  }[];
interface OrganizationResult {
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  projects: {
    id: string;
    name: string;
    slug: string;
  }[];
}

export const initCommand = new Command("init")
  .description("Set up project context for the CLI")
  .action(async () => {
    const { api, dashboardUrl } = requireAuth();

    try {
      const results = await api.query<OrganizationResult[]>(
        "organization.getAllByUserId",
        undefined
      );

      if (results.length === 0) {
        error("No organizations found. Create one in the dashboard first.");
        process.exit(1);
      }

      const orgChoice = await select({
        message: "Select an organization:",
        choices: results.map((r) => ({
          name: r.organization.name,
          value: r,
          description: r.organization.slug,
        })),
      });

      const projects = orgChoice.projects;

      if (projects.length === 0) {
        error(
          "No projects found in this organization. Create one in the dashboard first."
        );
        process.exit(1);
      }

      const projectChoice = await select({
        message: "Select a project:",
        choices: projects.map((project) => ({
          name: project.name,
          value: project,
          description: project.slug,
        })),
      });

      const ctx = {
        organizationSlug: orgChoice.organization.slug,
        organizationId: orgChoice.organization.id,
        projectSlug: projectChoice.slug,
        projectId: projectChoice.id,
        dashboardUrl,
      };

      setProjectContext(ctx);

      const saveLocal = await confirm({
        message: "Save a .gradual.json file in the current directory?",
        default: true,
      });

      if (saveLocal) {
        const localConfig = {
          organizationSlug: ctx.organizationSlug,
          organizationId: ctx.organizationId,
          projectSlug: ctx.projectSlug,
          projectId: ctx.projectId,
        };
        writeFileSync(
          resolve(process.cwd(), ".gradual.json"),
          `${JSON.stringify(localConfig, null, 2)}\n`
        );
      }

      success(
        `Project context set: ${orgChoice.organization.slug}/${projectChoice.slug}`
      );
    } catch (err) {
      if ((err as { name?: string }).name === "ExitPromptError") {
        return;
      }
      error(err instanceof Error ? err.message : "Init failed");
      process.exit(1);
    }
  });
