import { Command } from "commander";
import ora from "ora";
import { requireAuth, requireProject } from "../../lib/middleware.js";
import * as output from "../../lib/output.js";

interface Variation {
  id: string;
  name: string;
  value: unknown;
  isDefault: boolean;
}

interface FlagDetail {
  id: string;
  key: string;
  name: string;
  type: string;
  description: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  variations: Variation[];
}

export const flagsGetCommand = new Command("get")
  .description("Get details of a feature flag")
  .argument("<key>", "Flag key")
  .option("--json", "Output as JSON")
  .action(async (key: string, options: { json?: boolean }) => {
    const { api } = requireAuth();
    const project = requireProject();

    const spinner = ora("Fetching flag...").start();

    try {
      const flag = await api.query<FlagDetail>("featureFlags.getByKey", {
        key,
        projectSlug: project.projectSlug,
        organizationSlug: project.organizationSlug,
      });

      spinner.stop();

      if (options.json) {
        output.json(flag);
        return;
      }

      console.log();
      output.keyValue([
        ["Name", flag.name],
        ["Key", flag.key],
        ["Type", flag.type],
        ["Status", flag.archivedAt ? "archived" : "active"],
        ["Description", flag.description ?? "-"],
        ["Created", new Date(flag.createdAt).toLocaleDateString()],
        ["Updated", new Date(flag.updatedAt).toLocaleDateString()],
      ]);

      if (flag.variations.length > 0) {
        console.log();
        output.table(
          ["VARIATION", "VALUE", "DEFAULT"],
          flag.variations.map((v) => [
            v.name,
            String(v.value),
            v.isDefault ? "yes" : "",
          ])
        );
      }

      console.log();
    } catch (err) {
      spinner.fail(err instanceof Error ? err.message : "Failed to get flag");
      process.exit(1);
    }
  });
