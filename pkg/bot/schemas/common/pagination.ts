import z from "zod";

// Pagination metadata schema (reusable for any list endpoint)
export const paginationSchema = z.object({
  total: z.number().int().min(0).describe("Total number of items"),
  limit: z.number().int().positive().describe("Maximum items per page"),
  offset: z.number().int().min(0).describe("Number of items skipped"),
});
export type Pagination = z.infer<typeof paginationSchema>;

// Common pagination query parameters
export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
