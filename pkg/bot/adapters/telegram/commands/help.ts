/**
 * Help command definition - displays all available commands to users
 */

import type {Context} from "grammy";

import type {CommandRegistry} from "../command-registry";
import {commandRegistry} from "../command-registry";
import type {CommandDefinition, CommandMetadata} from "../types";

// Register help command metadata
commandRegistry.register({
  command: "/help",
  description: "Show available commands",
  category: "General",
});

type HelpInput = {
  isGroupChat: boolean;
};

type HelpResult = {
  categories: Array<{
    name: string;
    commands: CommandMetadata[];
  }>;
};

/**
 * Formats the help menu output from categorized commands.
 */
function formatHelpMenu(result: HelpResult, isGroupChat: boolean): string {
  const lines: string[] = [
    "🤖 *Saimontoro Help*",
    "",
    isGroupChat ? "Available commands in this group:" : "Welcome! Here are the available commands:",
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
 * Filters commands based on chat context.
 * In group chats, only show commands that are not marked as privateOnly.
 */
function filterCommandsForContext(
  commandsByCategory: Map<string, CommandMetadata[]>,
  isGroupChat: boolean,
): Map<string, CommandMetadata[]> {
  if (!isGroupChat) {
    return commandsByCategory;
  }

  const filtered = new Map<string, CommandMetadata[]>();
  for (const [category, commands] of commandsByCategory) {
    const groupCommands = commands.filter((cmd) => !cmd.privateOnly);
    if (groupCommands.length > 0) {
      filtered.set(category, groupCommands);
    }
  }
  return filtered;
}

/**
 * Creates the help command definition.
 *
 * @param registry - Command registry to read command metadata from
 * @returns Command definition for the /help command
 */
export function createHelpCommand(registry: CommandRegistry): CommandDefinition<HelpInput, unknown> {
  return {
    pattern: /^\/help$/,
    useCase: {
      run: async (input: HelpInput): Promise<{message: string}> => {
        const commandsByCategory = registry.getByCategory();
        const filteredCommands = filterCommandsForContext(commandsByCategory, input.isGroupChat);
        const categories = Array.from(filteredCommands.entries()).map(([name, commands]) => ({
          name,
          commands,
        }));

        if (categories.length === 0) {
          return {message: "🤖 *Saimontoro Help*\n\nNo commands are currently available."};
        }

        return {message: formatHelpMenu({categories}, input.isGroupChat)};
      },
    },
    parseInput: (ctx: Context): HelpInput => ({
      isGroupChat: ctx.chat?.type === "group" || ctx.chat?.type === "supergroup",
    }),
    response: {
      type: "text",
      template: "{{message}}",
    },
  };
}
