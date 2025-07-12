"use client";
import ImageUpload from "../components/ImageUpload";

export default function UploadPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-start pt-24 bg-gray-50 dark:bg-gray-900">
      <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">Upload an Image</h1>
      <p className="mb-6 text-gray-600 dark:text-gray-300 text-center max-w-xl">
        Use the form below to upload an image. Max file size: 200kB. Accepted formats: jpg, jpeg, png, webp, gif.
      </p>
      <ImageUpload />
    </div>
  );
} 