import z from "zod";

// Field-level validation error detail
export const errorDetailSchema = z.object({
  field: z.string().describe("Field path that caused the error"),
  message: z.string().describe("Human-readable error message for this field"),
});
export type ErrorDetail = z.infer<typeof errorDetailSchema>;

// Standard error response schema (reusable across all API resources)
export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string().describe("Error code for programmatic handling"),
    message: z.string().describe("Human-readable error message"),
    request_id: z.string().optional().describe("Request ID for debugging"),
    details: z.array(errorDetailSchema).optional().describe("Field-level validation errors"),
  }),
});
export type ErrorResponse = z.infer<typeof errorResponseSchema>;

// Empty response schema for 204 No Content
export const emptyResponseSchema = z.null();
