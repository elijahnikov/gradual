import chalk from "chalk";
import { Command } from "commander";
import ora from "ora";
import { requireAuth, requireProject } from "../../lib/middleware.js";
import * as output from "../../lib/output.js";

interface EvaluationDetail {
  id: string;
  featureFlagId: string;
  environmentId: string;
  variationId: string | null;
  variationName: string | null;
  context: Record<string, unknown> | null;
  value: unknown;
  reasons: unknown[] | null;
  evaluatedAt: string | null;
  ruleId: string | null;
  sdkVersion: string | null;
  sdkPlatform: string | null;
  userAgent: string | null;
  createdAt: string;
  matchedTargetName: string | null;
  flagConfigVersion: number | null;
  errorDetail: string | null;
  evaluationDurationUs: number | null;
  isAnonymous: boolean | null;
  inputsUsed: string[] | null;
  traceId: string | null;
  schemaVersion: number | null;
  policyVersion: number | null;
  flagKey: string;
  flagName: string;
  environmentName: string;
  environmentSlug: string;
  attributes: { key: string; value: string | null; valueJson: unknown }[];
}

export const evalsGetCommand = new Command("get")
  .description("Get details of an evaluation by ID (for debugging)")
  .argument("<id>", "Evaluation UUID")
  .option("--json", "Output as JSON")
  .action(async (evaluationId: string, options: { json?: boolean }) => {
    const { api } = requireAuth();
    const project = requireProject();

    const spinner = ora("Fetching evaluation...").start();

    try {
      const evaluation = await api.mutate<EvaluationDetail>(
        "featureFlags.getEventById",
        {
          evaluationId,
          projectSlug: project.projectSlug,
          organizationSlug: project.organizationSlug,
        }
      );

      spinner.stop();

      if (options.json) {
        output.json(evaluation);
        return;
      }

      console.log();
      output.keyValue([
        ["ID", evaluation.id],
        ["Flag", `${evaluation.flagName} (${evaluation.flagKey})`],
        ["Environment", evaluation.environmentName],
        ["Value", JSON.stringify(evaluation.value)],
        ["Variation", evaluation.variationName ?? "-"],
        ["Enabled Rule", evaluation.matchedTargetName ?? "-"],
      ]);

      console.log();
      console.log(chalk.dim("  Evaluation"));
      output.keyValue([
        [
          "  Evaluated At",
          evaluation.evaluatedAt
            ? new Date(evaluation.evaluatedAt).toISOString()
            : "-",
        ],
        [
          "  Latency",
          evaluation.evaluationDurationUs != null
            ? `${evaluation.evaluationDurationUs}µs`
            : "-",
        ],
        ["  Rule ID", evaluation.ruleId ?? "-"],
        [
          "  Config Version",
          evaluation.flagConfigVersion != null
            ? String(evaluation.flagConfigVersion)
            : "-",
        ],
        [
          "  Anonymous",
          evaluation.isAnonymous != null ? String(evaluation.isAnonymous) : "-",
        ],
      ]);

      if (evaluation.reasons && evaluation.reasons.length > 0) {
        console.log();
        console.log(chalk.dim("  Reasons"));
        for (const reason of evaluation.reasons) {
          console.log(`    ${JSON.stringify(reason)}`);
        }
      }

      if (evaluation.errorDetail) {
        console.log();
        console.log(chalk.dim("  Error"));
        console.log(`    ${chalk.red(evaluation.errorDetail)}`);
      }

      console.log();
      console.log(chalk.dim("  SDK"));
      output.keyValue([
        ["  Version", evaluation.sdkVersion ?? "-"],
        ["  Platform", evaluation.sdkPlatform ?? "-"],
        ["  User Agent", evaluation.userAgent ?? "-"],
      ]);

      if (evaluation.inputsUsed && evaluation.inputsUsed.length > 0) {
        console.log();
        console.log(chalk.dim("  Inputs Used"));
        console.log(`    ${evaluation.inputsUsed.join(", ")}`);
      }

      if (evaluation.attributes.length > 0) {
        console.log();
        output.table(
          ["ATTRIBUTE", "VALUE"],
          evaluation.attributes.map((a) => [
            a.key,
            a.valueJson != null
              ? JSON.stringify(a.valueJson)
              : (a.value ?? "-"),
          ])
        );
      }

      if (evaluation.traceId) {
        console.log();
        output.keyValue([["Trace ID", evaluation.traceId]]);
      }

      console.log();
    } catch (err) {
      spinner.fail(
        err instanceof Error ? err.message : "Failed to get evaluation"
      );
      process.exit(1);
    }
  });
