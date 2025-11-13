import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import {
  storageConfig,
  toSupabaseUri,
} from '@/lib/storage/utils';
import {
  uploadBufferToStorage,
  deleteStorageObjects,
  resolveStorageUrls,
} from '@/lib/storage/server';

const TEST_BUCKET = storageConfig.bucket;
const TEST_PREFIX = `${storageConfig.iosPrefix}-playwright-tests`;

const randomObjectPath = (extension: string) =>
  `${TEST_PREFIX}/${randomUUID()}.${extension}`;

test.describe('Supabase storage integration', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Storage API tests run once using the Chromium project.');
  const uploadedPaths: string[] = [];

  test.afterEach(async () => {
    if (uploadedPaths.length) {
      await deleteStorageObjects(TEST_BUCKET, [...uploadedPaths]);
      uploadedPaths.length = 0;
    }
  });

  test('stores a buffer and resolves a public URL', async () => {
    const objectPath = randomObjectPath('txt');
    const buffer = Buffer.from('storage playwright test', 'utf8');

    await uploadBufferToStorage(TEST_BUCKET, objectPath, buffer, 'text/plain');
    uploadedPaths.push(objectPath);

    const { data, error } = await supabaseAdmin.storage
      .from(TEST_BUCKET)
      .download(objectPath);

    expect(error).toBeNull();
    expect(await data?.text()).toBe('storage playwright test');

    const resolved = await resolveStorageUrls(toSupabaseUri(TEST_BUCKET, objectPath));
    expect(resolved.publicUrl).toBeTruthy();
  });

  test('rejects objects larger than the bucket limit', async () => {
    const objectPath = randomObjectPath('bin');
    const hugeBuffer = Buffer.alloc(51 * 1024 * 1024, 1); // 51MB

    await expect(
      uploadBufferToStorage(TEST_BUCKET, objectPath, hugeBuffer, 'application/octet-stream')
    ).rejects.toThrow();
  });

  test('deletes an uploaded object', async () => {
    const objectPath = randomObjectPath('json');
    const buffer = Buffer.from(JSON.stringify({ ok: true }), 'utf8');

    await uploadBufferToStorage(TEST_BUCKET, objectPath, buffer, 'application/json');

    await deleteStorageObjects(TEST_BUCKET, [objectPath]);

    const { data, error } = await supabaseAdmin.storage
      .from(TEST_BUCKET)
      .download(objectPath);

    expect(data).toBeNull();
    expect(error?.status).toBe(404);
  });
});

