/**
 * Object-storage module (Milestone 0 stub).
 *
 * Per build-spec §2/§5/§12, tenant photos live in S3-compatible storage
 * (Cloudflare R2 or AWS S3). Uploads use a presigned PUT; only the object
 * key is stored in the DB. Keys follow `tickets/{ticketId}/{uuid}.{ext}`.
 * File rules (single JPEG/PNG, ≤10 MB, randomised filename) are enforced
 * server-side by the caller.
 *
 * This is an infra placeholder: the real S3/R2 client is wired in a later
 * milestone. The functions are typed so callers can build against them now.
 */

export interface PresignedUpload {
  /** URL the client PUTs the file to. */
  url: string;
  /** Object key to persist on the ticket (`photoKey`). */
  key: string;
}

export interface CreatePresignedUploadParams {
  ticketId: string;
  /** File extension without the dot, e.g. "jpg" or "png". */
  ext: string;
  /** MIME type — must be image/jpeg or image/png (validated by caller). */
  contentType: string;
}

export async function createPresignedUpload(
  _params: CreatePresignedUploadParams,
): Promise<PresignedUpload> {
  // TODO: integrate an S3-compatible client (R2/S3) and return a presigned PUT
  // for key `tickets/{ticketId}/{uuid}.{ext}`.
  throw new Error("storage.createPresignedUpload not yet implemented (M0 stub)");
}

/**
 * Public URL for a stored object. Uses `STORAGE_PUBLIC_BASE_URL` + key when
 * configured; returns null if storage isn't set up yet (callers render a
 * "preview unavailable" placeholder rather than failing). Signed GETs can
 * replace this later without changing the call site.
 */
export function getObjectUrl(key: string): string | null {
  const base = process.env.STORAGE_PUBLIC_BASE_URL?.replace(/\/+$/, "");
  if (!base) return null;
  return `${base}/${key}`;
}

export interface PutObjectParams {
  /** Full object key, e.g. `tickets/{ticketId}/{uuid}.{ext}`. */
  key: string;
  body: Uint8Array;
  /** MIME type — must be image/jpeg or image/png (validated by caller). */
  contentType: string;
}

/**
 * Server-side upload of an already-validated object. The public form uploads
 * the tenant photo through here (key + bytes computed by the caller).
 *
 * Real S3/R2 integration lands in a later milestone; until then this throws so
 * callers fall back gracefully (a missing photo must never lose the ticket —
 * see `createTicket`). Storage being unconfigured is treated as "no photo".
 */
export async function putObject(_params: PutObjectParams): Promise<void> {
  // TODO: PutObject via an S3-compatible client (R2/S3).
  throw new Error("storage.putObject not yet implemented (M0 stub)");
}
