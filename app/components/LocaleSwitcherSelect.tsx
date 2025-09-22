'use client';

import clsx from 'clsx';
import {useParams} from 'next/navigation';
import {Locale} from 'next-intl';
import {ChangeEvent, useTransition, useState, Suspense} from 'react';
import {usePathname, useRouter} from '@/i18n/navigation';
import { Earth, ChevronDown } from 'lucide-react';

// Language configuration - just codes
const LANGUAGES = [
  { code: 'en' },
  { code: 'es' },
  { code: 'sr' },
];

type Props = {
  defaultValue: string;
  label: string;
};

function LocaleSwitcherContent({
  defaultValue,
  label
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();
  const params = useParams();
  const [currentLocale, setCurrentLocale] = useState(defaultValue);

  function onSelectChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextLocale = event.target.value as Locale;
    setCurrentLocale(nextLocale);
    startTransition(() => {
      router.replace(
        // @ts-expect-error -- TypeScript will validate that only known `params`
        // are used in combination with a given `pathname`. Since the two will
        // always match for the current route, we can skip runtime checks.
        {pathname, params},
        {locale: nextLocale}
      );
    });
  }

  return (
    <div className="relative group">
      <p className="sr-only">{label}</p>
      <button
        className={clsx(
          'flex items-center gap-2 px-3 py-2 rounded-full text-gray-700 dark:text-gray-200 group-hover:bg-gray-100 dark:group-hover:bg-gray-800 group-hover:scale-105 group-hover:shadow-md transition-all duration-200 ease-in-out',
          isPending && 'opacity-50 cursor-not-allowed'
        )}
        disabled={isPending}
        onClick={() => {
          // Toggle dropdown or handle click
          const select = document.querySelector('select') as HTMLSelectElement;
          select?.click();
        }}
      >
        <Earth size={20} className="text-gray-500 dark:text-gray-400 transition-colors duration-200" />
        <span className="text-sm font-medium">{currentLocale.toUpperCase()}</span>
        <ChevronDown size={16} className="text-gray-400 dark:text-gray-500 transition-colors duration-200" />
      </button>
      
      <select
        className="absolute inset-0 opacity-0 cursor-pointer z-10"
        value={currentLocale}
        disabled={isPending}
        onChange={onSelectChange}
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.code}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function LocaleSwitcherSelect(props: Props) {
  return (
    <Suspense fallback={
      <div className="flex items-center gap-2 px-3 py-2 rounded-full text-gray-700 dark:text-gray-200">
        <Earth size={20} className="text-gray-500 dark:text-gray-400" />
        <span className="text-sm font-medium">EN</span>
        <ChevronDown size={16} className="text-gray-400 dark:text-gray-500" />
      </div>
    }>
      <LocaleSwitcherContent {...props} />
    </Suspense>
  );
}