import type {z} from "zod";

export type RunContext<TInput> = {
  inputData: unknown;
  cleanData: TInput | null;
  startTime: Date;
  endTime: Date | null;
  executionTimeMs: number | null;
};

export abstract class BaseService<TInput = unknown, TResult = unknown> {
  // Override in subclass with the input schema for this use case.
  // If not defined, validation is skipped and data passes through as-is.
  protected inputSchema?: z.ZodType<TInput>;
  /**
   * Main entry point. Validates input, checks permissions, executes business logic.
   */
  async run(inputData: unknown): Promise<TResult> {
    const startTime = new Date();
    const context: RunContext<TInput> = {
      inputData,
      cleanData: null,
      startTime,
      endTime: null,
      executionTimeMs: null,
    };

    try {
      const cleanData = this.validate(inputData);
      context.cleanData = cleanData;

      await this.checkPermissions(cleanData);

      const result = await this.aroundExecute(cleanData, (data) => this.execute(data));

      context.endTime = new Date();
      context.executionTimeMs = context.endTime.getTime() - startTime.getTime();

      await this.onSuccess(result, context);
      return result;
    } catch (error) {
      await this.onError(error, context);
      throw error;
    }
  }

  protected validate(data: unknown): TInput {
    if (!this.inputSchema) {
      return (data ?? {}) as TInput;
    }
    return this.inputSchema.parse(data);
  }

  /**
   * Validate data with a dynamic schema. Use for conditional or multi-step validation.
   */
  protected validateWith<T>(data: unknown, schema: z.ZodType<T>): T {
    return schema.parse(data);
  }

  /**
   * Wraps execute() to add cross-cutting concerns like transactions, retries, logging.
   * Override in intermediate base classes to add wrapping behavior.
   * Call super.aroundExecute() to chain multiple wrappers.
   */
  protected async aroundExecute(
    cleanData: TInput,
    proceed: (data: TInput) => Promise<TResult>,
  ): Promise<TResult> {
    return proceed(cleanData);
  }

  /**
   * Called after successful execution. Override for logging, metrics, etc.
   */
  protected async onSuccess(_result: TResult, _context: RunContext<TInput>): Promise<void> {
    // Default: no-op
  }

  /**
   * Called when an error occurs. Override for error logging, cleanup, etc.
   */
  protected async onError(_error: unknown, _context: RunContext<TInput>): Promise<void> {
    // Default: no-op
  }

  /**
   * Permission check before execute. Must be implemented by subclasses.
   * Return without throwing to allow, throw an error to deny.
   */
  protected abstract checkPermissions(data: TInput): Promise<void>;

  /**
   * Business logic implementation. Must be implemented by subclasses.
   */
  protected abstract execute(data: TInput): Promise<TResult>;
}
