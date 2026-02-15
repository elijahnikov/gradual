import { Command } from "commander";
import { envsCommand } from "./commands/envs/index.js";
import { evalCommand } from "./commands/eval.js";
import { evalsCommand } from "./commands/evals/index.js";
import { flagsCommand } from "./commands/flags/index.js";
import { initCommand } from "./commands/init.js";
import { loginCommand } from "./commands/login.js";
import { logoutCommand } from "./commands/logout.js";
import { orgsCommand } from "./commands/orgs/index.js";
import { projectsCommand } from "./commands/projects/index.js";
import { publishCommand } from "./commands/publish.js";
import { whoamiCommand } from "./commands/whoami.js";

const program = new Command();

program
  .name("gradual")
  .description("Gradual - Feature flag management CLI")
  .version("0.0.1");

program.addCommand(loginCommand);
program.addCommand(logoutCommand);
program.addCommand(initCommand);
program.addCommand(whoamiCommand);
program.addCommand(evalCommand);
program.addCommand(evalsCommand);
program.addCommand(publishCommand);
program.addCommand(flagsCommand);
program.addCommand(orgsCommand);
program.addCommand(projectsCommand);
program.addCommand(envsCommand);

program.parse();
