/**
 * Type definitions for the Telegram Router
 */

import type {Context} from "grammy";
import z from "zod";


export const textResponseSchema = z.object({
  type: z.literal("text"),
  template: z.string(),
});

export type TextResponse<T> = z.infer<typeof textResponseSchema>;

export const keyboardButtonSchema = z.object({
  text: z.string(),
  callbackData: z.string(),
});

export type KeyboardButton<T> = z.infer<typeof keyboardButtonSchema>;

export const keyboardConfigSchema = z.object({
  buttons: z.array(z.array(keyboardButtonSchema)),
});

export type KeyboardConfig<T> = z.infer<typeof keyboardConfigSchema>;

export const textWithKeyboardResponseSchema = z.object({
  type: z.literal("text_with_keyboard"),
  template: z.string(),
  keyboard: keyboardConfigSchema,
});

export type TextWithKeyboardResponse<T> = z.infer<typeof textWithKeyboardResponseSchema>;

export const listResponseSchema = z.object({
  type: z.literal("list"),
  template: z.string(),
  itemTemplate: z.string(),
  itemsField: z.string(),
  emptyMessage: z.string(),
});

export type ListResponse<T> = z.infer<typeof listResponseSchema> & {
  itemsField: keyof T;
};

export const silentResponseSchema = z.object({
  type: z.literal("silent"),
});

export type SilentResponse = z.infer<typeof silentResponseSchema>;

export const responseConfigSchema = z.discriminatedUnion("type", [
  textResponseSchema,
  textWithKeyboardResponseSchema,
  listResponseSchema,
  silentResponseSchema,
]);

export type ResponseConfig<T> =
  | TextResponse<T>
  | TextWithKeyboardResponse<T>
  | ListResponse<T>
  | SilentResponse;

export const errorMappingSchema = z.object({
  errorType: z.string(),
  template: z.string(),
});

export type ErrorMapping = z.infer<typeof errorMappingSchema>;

export const errorResponseConfigSchema = z.object({
  mappings: z.array(errorMappingSchema),
  defaultTemplate: z.string(),
});

export type ErrorResponseConfig = z.infer<typeof errorResponseConfigSchema>;

export type CommandDefinition<TInput, TResult> = {
  pattern: RegExp;
  useCase: {run: (input: TInput) => Promise<TResult>};
  parseInput: (ctx: Context) => TInput;
  response: ResponseConfig<TResult>;
  errorResponse?: ErrorResponseConfig;
};
