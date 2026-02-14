import { Command } from "commander";
import ora from "ora";
import { requireAuth } from "../../lib/middleware.js";
import * as output from "../../lib/output.js";

interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

export const orgsListCommand = new Command("list")
  .description("List organizations")
  .option("--json", "Output as JSON")
  .action(async (options: { json?: boolean }) => {
    const { api } = requireAuth();

    const spinner = ora("Fetching organizations...").start();

    try {
      const orgs = await api.query<Organization[]>(
        "organization.getAllByUserId",
        undefined
      );

      spinner.stop();

      if (options.json) {
        output.json(orgs);
        return;
      }

      if (orgs.length === 0) {
        output.info("No organizations found");
        return;
      }

      output.table(
        ["NAME", "SLUG", "CREATED"],
        orgs.map((org) => [
          org.name,
          org.slug,
          new Date(org.createdAt).toLocaleDateString(),
        ])
      );
    } catch (err) {
      spinner.fail(
        err instanceof Error ? err.message : "Failed to list organizations"
      );
      process.exit(1);
    }
  });
