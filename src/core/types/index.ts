// ---------------------------------------------------------------------------
// Shared domain primitives
// ---------------------------------------------------------------------------

export type ID = string;

export type Money = number; // stored as integer cents to avoid float errors

export type Timestamp = number; // Unix ms, matches WatermelonDB date fields

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type Result<T, E = string> =
  | { success: true; data: T }
  | { success: false; error: E };
