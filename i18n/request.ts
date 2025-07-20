import {hasLocale} from 'next-intl';
import {getRequestConfig} from 'next-intl/server';
import {notFound} from 'next/navigation';

// Can be imported from a shared config
const locales = ['en', 'es', 'sr'];

export default getRequestConfig(async ({requestLocale}) => {
  
  const requested = await requestLocale;

  console.log("Requested locale: ", requested);

  const locale = hasLocale(locales, requested)
    ? requested
    : 'en';

  console.log("Ivan check if locale is valid: ", locale);
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as any)) notFound();

  console.log("Loading locale: ", locale);

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
}); 