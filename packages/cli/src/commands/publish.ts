import { Command } from "commander";
import ora from "ora";
import { requireAuth, requireProject } from "../lib/middleware.js";
import { error, success } from "../lib/output.js";

export const publishCommand = new Command("publish")
  .description("Publish feature flag snapshot")
  .option("--env <environment>", "Environment slug to publish to")
  .option("--all", "Publish to all environments")
  .action(async (options: { env?: string; all?: boolean }) => {
    if (!(options.env || options.all)) {
      error("Specify --env <slug> or --all");
      process.exit(1);
    }

    const { api } = requireAuth();
    const project = requireProject();

    const spinner = ora("Publishing...").start();

    try {
      if (options.all) {
        await api.mutate("snapshots.publishAll", {
          projectSlug: project.projectSlug,
          organizationSlug: project.organizationSlug,
        });
        spinner.stop();
        success("Published to all environments");
      } else {
        await api.mutate("snapshots.publish", {
          projectSlug: project.projectSlug,
          environmentSlug: options.env,
          organizationSlug: project.organizationSlug,
        });
        spinner.stop();
        success(`Published to ${options.env}`);
      }
    } catch (err) {
      spinner.fail(err instanceof Error ? err.message : "Publish failed");
      process.exit(1);
    }
  });
