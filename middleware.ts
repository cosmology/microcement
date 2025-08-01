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

interface GeolocationData {
  country?: string;
  city?: string;
  countryRegion?: string;
  ip?: string;
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
  const geo: GeolocationData = geolocation(req)
  
  // Mock data for development (remove in production)
  const mockGeo: GeolocationData = {
    country: 'US',
    city: 'San Diego',
    countryRegion: 'CA',
    ip: '127.0.0.1'
  };
  
  // Use mock data if geolocation is empty (development)
  const effectiveGeo = Object.keys(geo).length === 0 ? mockGeo : geo;
  
  const country = effectiveGeo.country || 'US'
  const city = effectiveGeo.city || 'San Diego'
  const region = effectiveGeo.countryRegion || 'CA'

  // Find country info from countries.json with proper type guard
  const countryInfo: Country | undefined = countriesTyped.find((x: Country) => x.cca2 === country)

  console.log("countryInfo: ", countryInfo)
  
  // Default values with proper typing
  let currencyCode = 'USD';
  let currency: Currency = { name: 'US Dollar', symbol: '$' };
  let languages = 'English';
  
  if (countryInfo && countryInfo.currencies && Object.keys(countryInfo.currencies).length > 0) {
    currencyCode = Object.keys(countryInfo.currencies)[0];
    currency = countryInfo.currencies[currencyCode];
    languages = Object.values(countryInfo.languages).join(', ');
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

// Run middleware on ALL paths EXCEPT"
export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}; 