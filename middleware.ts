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

// run only on homepage
export const config = {
  matcher: '/',
}

export async function middleware(req: NextRequest) {
  const { nextUrl: url } = req
  const geo = geolocation(req)
  const country = geo.country || 'US'
  const city = geo.city || 'San Francisco'
  const region = geo.countryRegion || 'CA'

  const countryInfo = countriesTyped.find((x) => x.cca2 === country);

  let currencyCode = 'USD';
  let currency = { symbol: '$', name: 'US Dollar' };
  let languages = 'English';

  if (countryInfo) {
    const codes = Object.keys(countryInfo.currencies);
    if (codes.length > 0) {
      currencyCode = codes[0];
      currency = countryInfo.currencies[currencyCode];
    }
    languages = Object.values(countryInfo.languages).join(', ');
  }

  url.searchParams.set('country', country);
  url.searchParams.set('city', city)
  url.searchParams.set('region', region)
  url.searchParams.set('currencyCode', currencyCode)
  url.searchParams.set('currencySymbol', currency.symbol)
  url.searchParams.set('name', currency.name)
  url.searchParams.set('languages', languages)

  return NextResponse.rewrite(url)
}

// export const config = {
//   matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
// }; 