"use client"
import { useSearchParams } from 'next/navigation'

interface GeoLocationParams {
  country?: string;
  city?: string;
  region?: string;
  currencyCode?: string;
  currencySymbol?: string;
  languages?: string;
}

export function GeoLocationSection() {
  const params = useSearchParams();
  // Defensive: fallback to empty string if params is null
  const getParam = (key: keyof GeoLocationParams) => params?.get(key) || '';

  const country = getParam('country');
  const city = getParam('city');
  const region = getParam('region');
  const currencyCode = getParam('currencyCode');
  const currencySymbol = getParam('currencySymbol');
  const languages = getParam('languages');

//   if (!country && !city && !region) return null;

  return (
    <div style={{ fontSize: '0.75rem', color: '#888', marginLeft: '1rem', whiteSpace: 'nowrap' }}>
      {city && <span>{city}, </span>}
      {region && <span>{region}, </span>}
      {country && <span>{country}</span>}
      {currencyCode && <span> &middot; {currencySymbol} ({currencyCode})</span>}
      {languages && <span> &middot; {languages}</span>}
    </div>
  );
} 