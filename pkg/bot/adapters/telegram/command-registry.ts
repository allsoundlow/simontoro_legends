/**
 * Command Registry - Centralized store for command metadata used by the help menu
 */

import type {CommandMetadata} from "./types";
import {commandMetadataSchema} from "./types";

/**
 * CommandRegistry stores metadata about all registered commands.
 * Used by the help command to display available commands to users.
 */
export class CommandRegistry {
  private commands: CommandMetadata[] = [];
  private registeredCommands = new Set<string>();
  private categoryOrder: string[] = ["General", "Admin Commands", "Group Commands", "Keyword Commands"];

  /**
   * Registers a single command's metadata.
   * Skips registration if the command is already registered.
   * @param metadata - Command metadata to register
   * @returns true if the command was registered, false if it was already present
   */
  register(metadata: CommandMetadata): boolean {
    if (this.registeredCommands.has(metadata.command)) {
      return false;
    }
    const validated = commandMetadataSchema.parse(metadata);
    this.commands.push(validated);
    this.registeredCommands.add(validated.command);
    return true;
  }

  /**
   * Registers multiple commands' metadata at once.
   * Skips any commands that are already registered.
   * @param metadata - Array of command metadata to register
   */
  registerMany(metadata: CommandMetadata[]): void {
    for (const m of metadata) {
      this.register(m);
    }
  }

  /**
   * Checks if a command is already registered.
   * @param command - The command string to check (e.g., "/connect_group")
   * @returns true if the command is already registered
   */
  has(command: string): boolean {
    return this.registeredCommands.has(command);
  }

  /**
   * Returns all registered commands in registration order.
   */
  getAll(): CommandMetadata[] {
    return [...this.commands];
  }

  /**
   * Returns commands grouped by category, with categories in predefined order.
   * Categories not in the predefined order are appended alphabetically.
   */
  getByCategory(): Map<string, CommandMetadata[]> {
    const grouped = new Map<string, CommandMetadata[]>();

    // Group commands by category
    for (const cmd of this.commands) {
      const existing = grouped.get(cmd.category) ?? [];
      existing.push(cmd);
      grouped.set(cmd.category, existing);
    }

    // Sort by predefined category order
    const sorted = new Map<string, CommandMetadata[]>();
    const seenCategories = new Set<string>();

    // Add categories in predefined order first
    for (const category of this.categoryOrder) {
      if (grouped.has(category)) {
        sorted.set(category, grouped.get(category)!);
        seenCategories.add(category);
      }
    }

    // Add remaining categories alphabetically
    const remainingCategories = Array.from(grouped.keys())
      .filter((c) => !seenCategories.has(c))
      .sort();

    for (const category of remainingCategories) {
      sorted.set(category, grouped.get(category)!);
    }

    return sorted;
  }

  /**
   * Clears all registered commands. Useful for testing.
   */
  clear(): void {
    this.commands = [];
    this.registeredCommands.clear();
  }
}

/** Singleton instance of the command registry */
export const commandRegistry = new CommandRegistry();
