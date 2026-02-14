import { Command } from "commander";
import ora from "ora";
import { requireAuth, requireProject } from "../lib/middleware.js";
import * as output from "../lib/output.js";

interface FlagResult {
  flag: {
    id: string;
    key: string;
    name: string;
    type: string;
  };
  environments: {
    environment: {
      id: string;
      name: string;
      slug: string;
    };
    enabled: boolean;
  }[];
}

interface TargetingRules {
  enabled: boolean;
  defaultVariation: {
    name: string;
    value: unknown;
  } | null;
}

interface Environment {
  id: string;
  name: string;
  slug: string;
}

export const evalCommand = new Command("eval")
  .description("Evaluate a feature flag")
  .argument("<flag-key>", "Flag key to evaluate")
  .option(
    "--env <environment>",
    "Environment slug (defaults to all environments)"
  )
  .option("--json", "Output as JSON")
  .action(
    async (flagKey: string, options: { env?: string; json?: boolean }) => {
      const { api } = requireAuth();
      const project = requireProject();

      const spinner = ora("Evaluating flag...").start();

      try {
        const result = await api.query<FlagResult>("featureFlags.getByKey", {
          key: flagKey,
          projectSlug: project.projectSlug,
          organizationSlug: project.organizationSlug,
        });
        const { flag } = result;

        const environments = await api.query<Environment[]>(
          "environment.list",
          {
            organizationId: project.organizationId,
            projectId: project.projectId,
            organizationSlug: project.organizationSlug,
          }
        );

        let targetEnvs = environments;
        if (options.env) {
          targetEnvs = environments.filter((e) => e.slug === options.env);
          if (targetEnvs.length === 0) {
            spinner.fail(`Environment "${options.env}" not found`);
            process.exit(1);
          }
        }

        const evalResults = [];

        for (const env of targetEnvs) {
          try {
            const rules = await api.query<TargetingRules>(
              "featureFlags.getTargetingRules",
              {
                flagId: flag.id,
                environmentSlug: env.slug,
                projectSlug: project.projectSlug,
                organizationSlug: project.organizationSlug,
              }
            );

            evalResults.push({
              environment: env.name,
              enabled: rules.enabled,
              value: rules.defaultVariation?.value ?? null,
              variation: rules.defaultVariation?.name ?? "-",
            });
          } catch {
            evalResults.push({
              environment: env.name,
              enabled: false,
              value: null,
              variation: "not configured",
            });
          }
        }

        spinner.stop();

        if (options.json) {
          output.json({ flag: flagKey, evaluations: evalResults });
          return;
        }

        console.log();
        output.keyValue([
          ["Flag", flag.name],
          ["Key", flag.key],
          ["Type", flag.type],
        ]);
        console.log();

        for (const evalResult of evalResults) {
          output.keyValue([
            ["Environment", evalResult.environment],
            ["Enabled", evalResult.enabled ? "ON" : "OFF"],
            ["Value", String(evalResult.value)],
            ["Variation", evalResult.variation],
          ]);
          console.log();
        }
      } catch (err) {
        spinner.fail(err instanceof Error ? err.message : "Evaluation failed");
        process.exit(1);
      }
    }
  );
