import React, { useState, ChangeEvent, FormEvent } from 'react';
import { paths } from '@/lib/config';

const API_URL = paths.upload; // Use centralized config
const MAX_SIZE = 200 * 1024; // 200kB
const ACCEPTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'];
const ACCEPTED_EXTS = '.jpg,.jpeg,.png,.webp,.gif';

export default function ImageUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function validateFile(selected: File | null): string | null {
    if (!selected) return null;
    if (!ACCEPTED_FORMATS.includes(selected.type)) {
      return 'Invalid file type. Accepted: jpg, jpeg, png, webp, gif.';
    }
    if (selected.size > MAX_SIZE) {
      return 'File too large. Max size is 200kB.';
    }
    return null;
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] || null;
    setFile(selected);
    setUploadedUrl(null);
    setError(null);
    if (selected) {
      const validation = validateFile(selected);
      if (validation) {
        setError(validation);
        setPreview(null);
        return;
      }
      setPreview(URL.createObjectURL(selected));
    } else {
      setPreview(null);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    const validation = validateFile(file);
    if (validation) {
      setError(validation);
      return;
    }
    setUploading(true);
    setProgress(0);
    setError(null);
    setUploadedUrl(null);
    const formData = new FormData();
    formData.append('image', file);
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', API_URL, true);
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setProgress(Math.round((event.loaded / event.total) * 100));
        }
      };
      xhr.onload = () => {
        setUploading(false);
        if (xhr.status === 200) {
          const res = JSON.parse(xhr.responseText);
          setUploadedUrl(res.filePath);
        } else {
          const res = JSON.parse(xhr.responseText);
          setError(res.error || 'Upload failed: ' + xhr.statusText);
        }
      };
      xhr.onerror = () => {
        setUploading(false);
        setError('Upload failed: Network error');
      };
      xhr.send(formData);
    } catch (err) {
      setUploading(false);
      setError('Upload failed: ' + (err as Error).message);
    }
  }

  // Compute the full image URL with PROJECT_PATH prefix
  const fullImageUrl = uploadedUrl ? config.getPath(uploadedUrl) : '';
  if (uploadedUrl) {
    console.log('🔗 Full image URL for View Image:', fullImageUrl);
  }

  return (
    <div className="max-w-md mx-auto p-4 border rounded-lg bg-white dark:bg-gray-900">
      <form onSubmit={handleSubmit}>
        <label className="block mb-2 font-semibold">Select an image to upload:</label>
        <input
          type="file"
          accept={ACCEPTED_EXTS}
          onChange={handleFileChange}
          className="mb-2"
          disabled={uploading}
        />
        <div className="text-xs text-gray-500 mb-4">
          Max file size: 200kB. Accepted formats: jpg, jpeg, png, webp, gif.
        </div>
        {preview && !error && (
          <div className="mb-4">
            <img src={preview} alt="Preview" className="max-h-48 rounded shadow" />
          </div>
        )}
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          disabled={!file || uploading || !!error}
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
        {uploading && (
          <div className="mt-2 text-sm">Progress: {progress}%</div>
        )}
        {error && <div className="mt-2 text-red-600">{error}</div>}
        {uploadedUrl && (
          <div className="mt-4">
            <div className="text-green-700">Upload successful!</div>
            <a
              href={fullImageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              View Image
            </a>
            <div className="mt-2">
              <img src={fullImageUrl} alt="Uploaded" className="max-h-48 rounded shadow" />
            </div>
          </div>
        )}
      </form>
    </div>
  );
} 