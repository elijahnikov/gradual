import { Command } from "commander";
import { getProjectContext } from "../lib/config.js";
import { requireAuth } from "../lib/middleware.js";
import { error, keyValue } from "../lib/output.js";

export const whoamiCommand = new Command("whoami")
  .description("Show current user and project context")
  .action(async () => {
    const { api } = requireAuth();

    try {
      const session = await api.query<{
        user: { email: string; name: string };
      }>("auth.getSession", undefined);

      const projectCtx = getProjectContext();

      const pairs: [string, string][] = [
        ["User", session.user.name || session.user.email],
        ["Email", session.user.email],
      ];

      if (projectCtx) {
        pairs.push(
          ["Organization", projectCtx.organizationSlug],
          ["Project", projectCtx.projectSlug]
        );
      } else {
        pairs.push(["Project", "Not set (run `gradual init`)"]);
      }

      console.log();
      keyValue(pairs);
      console.log();
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to fetch session");
      process.exit(1);
    }
  });
