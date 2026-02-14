import { Command } from "commander";
import ora from "ora";
import { requireAuth, requireProject } from "../lib/middleware.js";
import * as output from "../lib/output.js";

interface FlagResult {
  id: string;
  key: string;
  name: string;
  type: string;
}

interface Environment {
  id: string;
  name: string;
  slug: string;
}

interface PreviewEvaluation {
  environmentId: string;
  value: unknown;
  variationName: string;
  reason: string;
}

export const evalCommand = new Command("eval")
  .description("Evaluate a feature flag")
  .argument("<flag-key>", "Flag key to evaluate")
  .option(
    "--env <environment>",
    "Environment slug (defaults to first environment)"
  )
  .option("--json", "Output as JSON")
  .action(
    async (flagKey: string, options: { env?: string; json?: boolean }) => {
      const { api } = requireAuth();
      const project = requireProject();

      const spinner = ora("Evaluating flag...").start();

      try {
        const flag = await api.query<FlagResult>("featureFlags.getByKey", {
          key: flagKey,
          projectSlug: project.projectSlug,
          organizationSlug: project.organizationSlug,
        });

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

        const envIds = targetEnvs.map((e) => e.id).slice(0, 3);

        const evaluations = await api.query<PreviewEvaluation[]>(
          "featureFlags.getPreviewEvaluations",
          {
            flagId: flag.id,
            organizationId: project.organizationId,
            projectId: project.projectId,
            environmentIds: envIds,
            organizationSlug: project.organizationSlug,
          }
        );

        spinner.stop();

        if (options.json) {
          output.json({ flag: flagKey, evaluations });
          return;
        }

        console.log();
        output.keyValue([
          ["Flag", flag.name],
          ["Key", flag.key],
          ["Type", flag.type],
        ]);
        console.log();

        for (const evaluation of evaluations) {
          const env = targetEnvs.find((e) => e.id === evaluation.environmentId);
          output.keyValue([
            ["Environment", env?.name ?? evaluation.environmentId],
            ["Value", String(evaluation.value)],
            ["Variation", evaluation.variationName],
            ["Reason", evaluation.reason],
          ]);
          console.log();
        }
      } catch (err) {
        spinner.fail(err instanceof Error ? err.message : "Evaluation failed");
        process.exit(1);
      }
    }
  );
