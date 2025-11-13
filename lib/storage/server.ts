import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { storageConfig, parseSupabaseUri, toSupabaseUri, buildPublicStorageUrl, joinStoragePath } from './utils';

const ensuredBuckets = new Set<string>();

async function ensureBucketExists(bucket: string): Promise<void> {
  if (ensuredBuckets.has(bucket)) return;

  const { error } = await supabaseAdmin.storage.getBucket(bucket);
  if (error) {
    if (error.status === 404) {
      const { error: createError } = await supabaseAdmin.storage.createBucket(bucket, {
        public: true,
        fileSizeLimit: '52428800', // 50MB
      });
      if (createError && createError.status !== 409) {
        throw createError;
      }
    } else if (error.status !== 409) {
      throw error;
    }
  }

  ensuredBuckets.add(bucket);
}

export async function uploadBufferToStorage(
  bucket: string,
  objectPath: string,
  buffer: Buffer,
  contentType: string
): Promise<void> {
  await ensureBucketExists(bucket);
  const { error } = await supabaseAdmin.storage.from(bucket).upload(objectPath, buffer, {
    contentType,
    upsert: true,
  });
  if (error) {
    throw error;
  }
}

export async function downloadBufferFromStorage(bucket: string, objectPath: string): Promise<Buffer> {
  const { data, error } = await supabaseAdmin.storage.from(bucket).download(objectPath);
  if (error || !data) {
    throw error ?? new Error('Unable to download object from storage');
  }

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function deleteStorageObjects(bucket: string, paths: string[]): Promise<void> {
  if (!paths.length) return;
  const { error } = await supabaseAdmin.storage.from(bucket).remove(paths);
  if (error) {
    throw error;
  }
}

export async function createSignedUrl(bucket: string, objectPath: string): Promise<string | null> {
  const expiresIn = Number.isFinite(storageConfig.signedUrlExpirySeconds)
    ? Math.max(storageConfig.signedUrlExpirySeconds, 0)
    : 0;

  if (!expiresIn) {
    return null;
  }

  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(objectPath, expiresIn);

  if (error) {
    console.warn('Failed to create signed URL:', error);
    return null;
  }

  return data?.signedUrl ?? null;
}

export function createSupabaseUri(bucket: string, objectPath: string): string {
  return toSupabaseUri(bucket, objectPath);
}

export function parseSupabasePath(raw?: string | null) {
  return parseSupabaseUri(raw ?? undefined);
}

export function getPublicUrlFromUri(raw?: string | null): string | null {
  const parsed = parseSupabaseUri(raw ?? undefined);
  if (!parsed) {
    return raw ?? null;
  }
  return buildPublicStorageUrl(parsed.bucket, parsed.path);
}

export function buildIosUploadPath(userId: string, sceneId: string, filename: string) {
  return joinStoragePath(
    storageConfig.iosPrefix,
    userId,
    sceneId,
    filename
  );
}

export function buildJsonMetadataPath(userId: string, sceneId: string, filename: string) {
  return joinStoragePath(
    storageConfig.jsonPrefix,
    userId,
    sceneId,
    filename
  );
}

export function buildGlbPath(userId: string, sceneId: string, filename: string) {
  return joinStoragePath(
    storageConfig.glbPrefix,
    userId,
    sceneId,
    filename
  );
}

export async function resolveStorageUrls(rawPath?: string | null) {
  if (!rawPath) {
    return {
      rawPath: null,
      publicUrl: null,
      signedUrl: null,
      bucket: null,
      objectPath: null,
    };
  }

  const parsed = parseSupabaseUri(rawPath);
  if (!parsed) {
    return {
      rawPath,
      publicUrl: rawPath,
      signedUrl: null,
      bucket: null,
      objectPath: null,
    };
  }

  const publicUrl = buildPublicStorageUrl(parsed.bucket, parsed.path);
  const signedUrl = await createSignedUrl(parsed.bucket, parsed.path);

  return {
    rawPath,
    publicUrl,
    signedUrl,
    bucket: parsed.bucket,
    objectPath: parsed.path,
  };
}

