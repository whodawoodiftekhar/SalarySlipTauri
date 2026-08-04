import { env } from "@/config/env";
import { HttpError } from "./httpError";

/** Pulls the server's suggested name out of Content-Disposition. */
const nameFromDisposition = (header: string | null): string | null => {
  const match = header?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  return match ? decodeURIComponent(match[1]) : null;
};

/** Server-sent JSON error message, when the failure body carries one. */
async function readErrorMessage(res: Response, fallback: string) {
  const text = await res.text().catch(() => "");
  if (!text) return fallback;
  try {
    return (JSON.parse(text) as { message?: string }).message ?? text;
  } catch {
    return text;
  }
}

/**
 * Saves a binary endpoint's response to the user's Downloads folder.
 *
 * apiClient always parses JSON, so PDF routes need their own path — this keeps
 * the anchor-click dance in one place instead of in every screen that reprints.
 *
 * @returns the filename that was saved
 */
export async function downloadFile(
  path: string,
  {
    method = "GET",
    body,
    fallbackName = "download",
  }: { method?: string; body?: unknown; fallbackName?: string } = {},
): Promise<string> {
  const res = await fetch(`${env.apiUrl}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    throw new HttpError(
      res.status,
      await readErrorMessage(res, `${res.status} ${res.statusText} — ${path}`),
    );
  }

  const blob = await res.blob();
  if (blob.size === 0) throw new Error("The server returned an empty file.");

  const filename = nameFromDisposition(res.headers.get("content-disposition")) ?? fallbackName;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.style.display = "none";
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 1500);

  return filename;
}
