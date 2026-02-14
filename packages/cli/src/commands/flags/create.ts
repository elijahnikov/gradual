import { Command } from "commander";
import ora from "ora";
import { requireAuth, requireProject } from "../../lib/middleware.js";
import { error, success } from "../../lib/output.js";

const KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:-)?$/;

interface Variation {
  name: string;
  value: boolean | string | number;
  isDefault: boolean;
}

export const flagsCreateCommand = new Command("create")
  .description("Create a new feature flag")
  .argument("<key>", "Flag key (lowercase with hyphens, e.g. my-feature)")
  .requiredOption("--name <name>", "Flag display name")
  .option(
    "--type <type>",
    "Flag type (boolean, string, number, json)",
    "boolean"
  )
  .option("--description <desc>", "Flag description")
  .action(
    async (
      key: string,
      options: { name: string; type: string; description?: string }
    ) => {
      const { api } = requireAuth();
      const project = requireProject();

      if (!KEY_PATTERN.test(key)) {
        error(
          "Key must contain lowercase letters, numbers, and hyphens only (e.g. my-feature)"
        );
        process.exit(1);
      }

      const validTypes = ["boolean", "string", "number", "json"];
      if (!validTypes.includes(options.type)) {
        error(`Type must be one of: ${validTypes.join(", ")}`);
        process.exit(1);
      }

      let variations: Variation[];
      if (options.type === "boolean") {
        variations = [
          { name: "True", value: true, isDefault: false },
          { name: "False", value: false, isDefault: true },
        ];
      } else {
        variations = [
          {
            name: "Default",
            value: options.type === "number" ? 0 : "",
            isDefault: true,
          },
        ];
      }

      const spinner = ora("Creating flag...").start();

      try {
        await api.mutate("featureFlags.create", {
          key,
          name: options.name,
          type: options.type,
          description: options.description ?? null,
          projectSlug: project.projectSlug,
          organizationSlug: project.organizationSlug,
          maintainerId: null,
          variations,
          defaultWhenOnVariationIndex: 0,
          defaultWhenOffVariationIndex: options.type === "boolean" ? 1 : 0,
        });

        spinner.stop();
        success(`Flag "${key}" created`);
      } catch (err) {
        spinner.fail(
          err instanceof Error ? err.message : "Failed to create flag"
        );
        process.exit(1);
      }
    }
  );
