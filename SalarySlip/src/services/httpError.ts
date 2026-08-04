export class HttpError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.body = body;
  }
}

export const isHttpError = (e: unknown): e is HttpError => e instanceof HttpError;

/**
 * The most useful sentence available for an error.
 *
 * The API answers a rejected write with `{ message }` — "Component code
 * \"BASIC\" already belongs to…" — and that is the only part worth showing.
 * Without this, every failed write read as "409 Conflict — /salary-components".
 */
export const errorMessage = (e: unknown): string => {
  if (isHttpError(e) && typeof e.body === "string") {
    try {
      const parsed = JSON.parse(e.body);
      if (parsed?.message) return String(parsed.message);
    } catch {
      // a non-JSON body is server noise, not something to show
    }
  }
  return e instanceof Error ? e.message : String(e);
};
