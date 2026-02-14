import { Command } from "commander";
import ora from "ora";
import { requireAuth, requireProject } from "../../lib/middleware.js";
import { success } from "../../lib/output.js";

interface FlagResult {
  flag: {
    id: string;
    key: string;
    name: string;
  };
}

interface TargetingRules {
  targets: unknown[];
  enabled: boolean;
  defaultVariationId: string | null;
  defaultRollout: unknown | null;
  offVariationId: string | null;
}

export const flagsToggleCommand = new Command("toggle")
  .description("Toggle a feature flag on/off for an environment")
  .argument("<key>", "Flag key")
  .requiredOption("--env <environment>", "Environment slug")
  .action(async (key: string, options: { env: string }) => {
    const { api } = requireAuth();
    const project = requireProject();

    const spinner = ora("Toggling flag...").start();

    try {
      const result = await api.query<FlagResult>("featureFlags.getByKey", {
        key,
        projectSlug: project.projectSlug,
        organizationSlug: project.organizationSlug,
      });

      const rules = await api.query<TargetingRules>(
        "featureFlags.getTargetingRules",
        {
          flagId: result.flag.id,
          environmentSlug: options.env,
          projectSlug: project.projectSlug,
          organizationSlug: project.organizationSlug,
        }
      );

      const newEnabled = !rules.enabled;

      await api.mutate("featureFlags.saveTargetingRules", {
        flagId: result.flag.id,
        environmentSlug: options.env,
        projectSlug: project.projectSlug,
        organizationSlug: project.organizationSlug,
        targets: rules.targets,
        defaultVariationId: rules.defaultVariationId,
        defaultRollout: rules.defaultRollout,
        enabled: newEnabled,
        offVariationId: rules.offVariationId,
      });

      spinner.stop();
      success(
        `Flag "${key}" is now ${newEnabled ? "ON" : "OFF"} in ${options.env}`
      );
    } catch (err) {
      spinner.fail(err instanceof Error ? err.message : "Toggle failed");
      process.exit(1);
    }
  });
