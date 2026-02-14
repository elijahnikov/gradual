import { Command } from "commander";
import { clearCredentials } from "../lib/config.js";
import { success } from "../lib/output.js";

export const logoutCommand = new Command("logout")
  .description("Log out of Gradual")
  .action(() => {
    clearCredentials();
    success("Logged out");
  });
