/**
 * Help command definition - displays all available commands to users
 */

import type {CommandRegistry} from "../command-registry";
import {commandRegistry} from "../command-registry";
import type {CommandDefinition, CommandMetadata} from "../types";

// Register help command metadata
commandRegistry.register({
  command: "/help",
  description: "Show this help menu",
  category: "General",
  privateOnly: true,
});

type HelpResult = {
  categories: Array<{
    name: string;
    commands: CommandMetadata[];
  }>;
};

/**
 * Formats the help menu output from categorized commands.
 */
function formatHelpMenu(result: HelpResult): string {
  const lines: string[] = [
    "🤖 *Saimontoro Help*",
    "",
    "Welcome! Here are the available commands:",
  ];

  for (const category of result.categories) {
    lines.push("");
    lines.push(`*${category.name}*`);

    for (const cmd of category.commands) {
      let line = `\`${cmd.command}\` — ${cmd.description}`;
      if (cmd.usage) {
        line += `\n    _Usage: ${cmd.usage}_`;
      }
      lines.push(line);
    }
  }

  return lines.join("\n");
}

/**
 * Creates the help command definition.
 *
 * @param registry - Command registry to read command metadata from
 * @returns Command definition for the /help command
 */
export function createHelpCommand(registry: CommandRegistry): CommandDefinition<unknown, unknown> {
  return {
    pattern: /^\/help$/,
    chatFilter: "private",
    useCase: {
      run: async (): Promise<{message: string}> => {
        const commandsByCategory = registry.getByCategory();
        const categories = Array.from(commandsByCategory.entries()).map(([name, commands]) => ({
          name,
          commands,
        }));

        if (categories.length === 0) {
          return {message: "🤖 *Saimontoro Help*\n\nNo commands are currently available."};
        }

        return {message: formatHelpMenu({categories})};
      },
    },
    parseInput: () => ({}),
    response: {
      type: "text",
      template: "{{message}}",
    },
  };
}
