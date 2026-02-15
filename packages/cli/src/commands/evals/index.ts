import { Command } from "commander";
import { evalsGetCommand } from "./get.js";

export const evalsCommand = new Command("evals")
  .description("Inspect evaluations")
  .addCommand(evalsGetCommand);
