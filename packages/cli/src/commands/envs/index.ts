import { Command } from "commander";
import { envsListCommand } from "./list.js";

export const envsCommand = new Command("envs")
  .description("Manage environments")
  .addCommand(envsListCommand);
