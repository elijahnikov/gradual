import { Command } from "commander";
import ora from "ora";
import { requireAuth, requireProject } from "../../lib/middleware.js";
import * as output from "../../lib/output.js";

interface Project {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

export const projectsListCommand = new Command("list")
  .description("List projects")
  .option("--json", "Output as JSON")
  .action(async (options: { json?: boolean }) => {
    const { api } = requireAuth();
    const project = requireProject();

    const spinner = ora("Fetching projects...").start();

    try {
      const projects = await api.query<Project[]>(
        "project.getAllByOrganizationId",
        {
          organizationId: project.organizationId,
          organizationSlug: project.organizationSlug,
        }
      );

      spinner.stop();

      if (options.json) {
        output.json(projects);
        return;
      }

      if (projects.length === 0) {
        output.info("No projects found");
        return;
      }

      output.table(
        ["NAME", "SLUG", "CREATED"],
        projects.map((p) => [
          p.name,
          p.slug,
          new Date(p.createdAt).toLocaleDateString(),
        ])
      );
    } catch (err) {
      spinner.fail(
        err instanceof Error ? err.message : "Failed to list projects"
      );
      process.exit(1);
    }
  });
