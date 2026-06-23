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

export async function getObjectUrl(_key: string): Promise<string> {
  // TODO: return `${STORAGE_PUBLIC_BASE_URL}/${key}` or a signed GET URL.
  throw new Error("storage.getObjectUrl not yet implemented (M0 stub)");
}
