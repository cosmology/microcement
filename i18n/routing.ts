import {defineRouting} from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'sr'],
  defaultLocale: 'en',
  pathnames: {
    '/': '/',
    '/pathnames': {
      sr: '/prebaci'
    }
  }
});