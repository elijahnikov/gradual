import chalk from "chalk";
import { Command } from "commander";
import ora from "ora";
import { deviceLogin } from "../lib/auth.js";
import { getDashboardUrl, setCredentials } from "../lib/config.js";

export const loginCommand = new Command("login")
  .description("Log in to Gradual")
  .option("--url <url>", "Dashboard URL")
  .action(async (options: { url?: string }) => {
    const dashboardUrl = options.url ?? getDashboardUrl();

    console.log(chalk.bold("Logging in to Gradual..."));

    try {
      const result = await deviceLogin(dashboardUrl);

      setCredentials({
        token: result.token,
        expiresAt: result.expiresAt,
        dashboardUrl,
      });

      console.log(
        chalk.green(`✓ Logged in as ${chalk.bold(result.user.email)}`)
      );
    } catch (err) {
      const spinner = ora();
      spinner.fail(err instanceof Error ? err.message : "Login failed");
      process.exit(1);
    }
  });
