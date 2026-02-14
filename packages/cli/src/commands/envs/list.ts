import { Command } from "commander";
import ora from "ora";
import { requireAuth, requireProject } from "../../lib/middleware.js";
import * as output from "../../lib/output.js";

interface Environment {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  createdAt: string;
}

export const envsListCommand = new Command("list")
  .description("List environments")
  .option("--json", "Output as JSON")
  .action(async (options: { json?: boolean }) => {
    const { api } = requireAuth();
    const project = requireProject();

    const spinner = ora("Fetching environments...").start();

    try {
      const envs = await api.query<Environment[]>("environment.list", {
        organizationId: project.organizationId,
        projectId: project.projectId,
        organizationSlug: project.organizationSlug,
      });

      spinner.stop();

      if (options.json) {
        output.json(envs);
        return;
      }

      if (envs.length === 0) {
        output.info("No environments found");
        return;
      }

      output.table(
        ["NAME", "SLUG", "CREATED"],
        envs.map((env) => [
          env.name,
          env.slug,
          new Date(env.createdAt).toLocaleDateString(),
        ])
      );
    } catch (err) {
      spinner.fail(
        err instanceof Error ? err.message : "Failed to list environments"
      );
      process.exit(1);
    }
  });
