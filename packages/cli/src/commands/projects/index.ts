import { Command } from "commander";
import { projectsListCommand } from "./list.js";

export const projectsCommand = new Command("projects")
  .description("Manage projects")
  .addCommand(projectsListCommand);
