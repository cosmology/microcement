export const SUPABASE_URI_SCHEME = 'supabase://';

export interface SupabaseUriParts {
  bucket: string;
  path: string;
}

export const storageConfig = {
  bucket: process.env.SUPABASE_STORAGE_BUCKET_SCANNED_ROOMS || 'scanned-rooms',
  iosPrefix: process.env.SUPABASE_STORAGE_PREFIX_IOS || 'ios-uploads',
  jsonPrefix: process.env.SUPABASE_STORAGE_PREFIX_JSON || 'ios-metadata',
  glbPrefix: process.env.SUPABASE_STORAGE_PREFIX_GLBS || 'processed-glb',
  signedUrlExpirySeconds: Number.parseInt(process.env.SUPABASE_STORAGE_SIGNED_URL_EXPIRES || '3600', 10),
};

export function sanitizeSegment(segment: string): string {
  return segment.replace(/[^a-zA-Z0-9-_]/g, '_');
}

export function joinStoragePath(...segments: string[]): string {
  return segments
    .map((segment) => segment.trim().replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/');
}

export function toSupabaseUri(bucket: string, objectPath: string): string {
  return `${SUPABASE_URI_SCHEME}${bucket}/${objectPath}`;
}

export function parseSupabaseUri(raw?: string | null): SupabaseUriParts | null {
  if (!raw || typeof raw !== 'string') {
    return null;
  }

  if (!raw.startsWith(SUPABASE_URI_SCHEME)) {
    return null;
  }

  const remainder = raw.slice(SUPABASE_URI_SCHEME.length);
  const slashIndex = remainder.indexOf('/');
  if (slashIndex === -1) {
    return null;
  }

  const bucket = remainder.slice(0, slashIndex);
  const objectPath = remainder.slice(slashIndex + 1);

  if (!bucket || !objectPath) {
    return null;
  }

  return { bucket, path: objectPath };
}

export function buildPublicStorageUrl(bucket: string, objectPath: string): string | null {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) {
    return null;
  }
  const trimmedBase = baseUrl.replace(/\/+$/, '');
  return `${trimmedBase}/storage/v1/object/public/${bucket}/${objectPath}`;
}

export function resolveToPublicUrl(raw?: string | null): string | null {
  if (!raw) {
    return null;
  }

  const parsed = parseSupabaseUri(raw);
  if (!parsed) {
    // Already a conventional URL or relative path
    return raw;
  }

  return buildPublicStorageUrl(parsed.bucket, parsed.path);
}

