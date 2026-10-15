import prisma from "../../config/database.config";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Formats vision models accept (OpenAI: PNG, JPEG, WEBP, non-animated GIF). */
export const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) =>
  signature.every((byte, index) => bytes[offset + index] === byte);

const ascii = (text: string) => [...text].map((char) => char.charCodeAt(0));

/**
 * Detects the image type from the file's leading bytes.
 * The client-sent MIME type is never trusted — a renamed file must not reach the model.
 */
export function detectImageType(bytes: Uint8Array): string | null {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, ascii("GIF87a")) || startsWith(bytes, ascii("GIF89a"))) return "image/gif";
  if (startsWith(bytes, ascii("RIFF")) && startsWith(bytes, ascii("WEBP"), 8)) return "image/webp";
  return null;
}

export interface StoredImage {
  name: string;
  mimeType: string;
  data: Uint8Array;
}

/** Loads image bytes by id, limited to this user's images. Unknown or foreign ids are absent. */
export async function loadOwnedImages(
  ids: string[],
  userId: string,
): Promise<Map<string, StoredImage>> {
  if (ids.length === 0) return new Map();

  const rows = await prisma.chatImage.findMany({
    where: { id: { in: [...new Set(ids)] }, userId },
    select: { id: true, name: true, mimeType: true, data: true },
  });

  return new Map(rows.map(({ id, ...image }) => [id, image]));
}
