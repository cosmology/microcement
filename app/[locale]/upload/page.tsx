"use client";
import { useTranslations } from 'next-intl';
import ImageUpload from "../../components/ImageUpload";

export default function UploadPage() {
  const t = useTranslations('Upload');
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-start pt-24 bg-gray-50 dark:bg-gray-900">
      <h1 className="text-3xl font-light mb-2 text-gray-900 dark:text-white">{t('title')}</h1>
      <p className="mb-6 text-gray-600 dark:text-gray-300 text-center max-w-xl">
        {t('description')}
      </p>
      <ImageUpload />
    </div>
  );
} 