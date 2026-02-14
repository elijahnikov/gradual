import { Command } from "commander";
import { orgsListCommand } from "./list.js";

export const orgsCommand = new Command("orgs")
  .description("Manage organizations")
  .addCommand(orgsListCommand);
