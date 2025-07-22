import { geolocation } from '@vercel/functions'
import { type NextRequest, NextResponse } from 'next/server'
import countries from './lib/countries.json'
import createMiddleware from 'next-intl/middleware';

// Type definitions for countries.json
interface Currency {
  name: string;
  symbol: string;
}
interface Country {
  cca2: string;
  currencies: Record<string, Currency>;
  languages: Record<string, string>;
  flag: string;
}
// Cast countries to Country[]
const countriesTyped = countries as unknown as Country[];

const ENGLISH_COUNTRIES = ['US', 'GB', 'CA', 'IE', 'AU', 'NZ'];
const SERBIAN_COUNTRIES = ['RS', 'HR', 'BA', 'ME', 'MK'];
const SPANISH_COUNTRIES = [
  'ES', 'MX', 'AR', 'CO', 'CL', 'PE', 'VE', 'EC', 'GT', 'CU', 'BO', 'DO', 'HN', 'PY', 'SV', 'NI', 'CR', 'PA', 'UY', 'GQ'
];

function getLocaleFromCountry(country: string) {
  if (ENGLISH_COUNTRIES.includes(country)) return 'en';
  if (SERBIAN_COUNTRIES.includes(country)) return 'sr';
  if (SPANISH_COUNTRIES.includes(country)) return 'es';
  return 'en'; // fallback
}

export async function middleware(req: NextRequest) {
  const { nextUrl: url } = req
  const geo = geolocation(req)
  const country = geo.country || 'US'
  const city = geo.city || 'San Diego'
  const region = geo.countryRegion || 'CA'

  // Find country info from countries.json
  const countryInfo = countriesTyped.find((x) => x.cca2 === country)
  let currencyCode = 'USD', currency = { name: 'US Dollar', symbol: '$' }, languages = 'English';
  if (countryInfo) {
    currencyCode = Object.keys(countryInfo.currencies)[0]
    currency = countryInfo.currencies[currencyCode]
    languages = Object.values(countryInfo.languages).join(', ')
  }

  // Set locale based on country
  const locale = getLocaleFromCountry(country.trim().toUpperCase());

  // Add geolocation/currency/language info to query params
  url.searchParams.set('country', country)
  url.searchParams.set('city', city)
  url.searchParams.set('region', region)
  url.searchParams.set('currencyCode', currencyCode)
  url.searchParams.set('currencySymbol', currency.symbol)
  url.searchParams.set('name', currency.name)
  url.searchParams.set('languages', languages)

  // Log for debugging
  console.log({ geo, country, city, region, currencyCode, currency, languages, locale })

  // Supported locales
  const supportedLocales = ['en', 'es', 'sr'];
  const pathname = url.pathname;

  // If the path does not start with a supported locale, redirect to the detected locale
  if (!supportedLocales.some(l => pathname.startsWith(`/${l}`))) {
    url.pathname = `/${locale}${pathname}`;
    return NextResponse.redirect(url);
  }

  // Otherwise, let next-intl handle the rest
  return createMiddleware({
    locales: supportedLocales,
    defaultLocale: 'en'
  })(req);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}; 