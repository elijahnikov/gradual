import { Command } from "commander";
import { flagsCreateCommand } from "./create.js";
import { flagsGetCommand } from "./get.js";
import { flagsListCommand } from "./list.js";
import { flagsToggleCommand } from "./toggle.js";

export const flagsCommand = new Command("flags")
  .description("Manage feature flags")
  .addCommand(flagsListCommand)
  .addCommand(flagsGetCommand)
  .addCommand(flagsCreateCommand)
  .addCommand(flagsToggleCommand);
