import { Command } from "commander";
import ora from "ora";
import { requireAuth, requireProject } from "../../lib/middleware.js";
import * as output from "../../lib/output.js";

interface Flag {
  id: string;
  key: string;
  name: string;
  type: string;
  archivedAt: string | null;
  createdAt: string;
}

interface FlagListResponse {
  data: Flag[];
  nextCursor?: { value: string | number; id: string };
}

export const flagsListCommand = new Command("list")
  .description("List feature flags")
  .option("--search <query>", "Search flags by name or key")
  .option("--limit <n>", "Number of flags to return", "20")
  .option("--json", "Output as JSON")
  .action(
    async (options: { search?: string; limit?: string; json?: boolean }) => {
      const { api } = requireAuth();
      const project = requireProject();

      const spinner = ora("Fetching flags...").start();

      try {
        const result = await api.query<FlagListResponse>(
          "featureFlags.getAll",
          {
            projectSlug: project.projectSlug,
            organizationSlug: project.organizationSlug,
            limit: Number.parseInt(options.limit ?? "20", 10),
            search: options.search,
          }
        );

        spinner.stop();

        if (options.json) {
          output.json(result.data);
          return;
        }

        if (result.data.length === 0) {
          output.info("No flags found");
          return;
        }

        output.table(
          ["KEY", "NAME", "TYPE", "STATUS", "CREATED"],
          result.data.map((flag) => [
            flag.key,
            flag.name,
            flag.type,
            flag.archivedAt ? "archived" : "active",
            new Date(flag.createdAt).toLocaleDateString(),
          ])
        );
      } catch (err) {
        spinner.fail(
          err instanceof Error ? err.message : "Failed to list flags"
        );
        process.exit(1);
      }
    }
  );
