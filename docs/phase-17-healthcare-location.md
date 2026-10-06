# Phase 17 — Healthcare Location

Phase 17 adds location features using only approved facilities already stored in `public.healthcare_facilities`.

## Implemented behavior

- Patient facility directory remains server-filtered to approved facilities.
- Facility cards include address-based Google Maps search links.
- Facility cards include Google Maps directions links.
- Stored coordinates are used when available; otherwise Google Maps searches the facility name and address.
- Browser geolocation can sort facilities by distance using the Haversine formula.
- Device coordinates remain in browser memory and are not sent to HealthConnect or persisted.
- Facilities without coordinates remain visible and usable through address-based search.
- Admin facility metadata includes coordinate coverage for operational auditing.

## Supabase schema

The Phase 17 migration adds:

- A coordinate check constraint: latitude `-90..90`, longitude `-180..180`, or both values null.
- A partial index for approved facilities with coordinates.

No external nationwide facility directory is used.

## Google Maps configuration

This phase uses public Google Maps URL endpoints (`maps/search` and `maps/dir`) rather than an embedded Google Maps JavaScript SDK. Therefore no Google API key is required for the implemented feature, and no key is exposed to the browser.

If a later phase requires an embedded interactive map, add a restricted browser key as `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in Vercel and `.env.local`, with HTTP referrer restrictions and only the required Maps APIs enabled. Do not add a server key to frontend code.

## Limitations

- Distance sorting requires the user to grant browser location permission.
- Facilities without stored coordinates cannot be ranked by exact distance.
- Directions and map rendering are delegated to Google Maps in a new browser tab.
- Geocoding is not performed automatically; administrators must maintain coordinates in the facility record.

## Next module plan — Phase 18

Phase 18 will add English/Hindi translation resources and a user language switcher across navigation, portals, forms, notifications, and the AI interface. Clinical instructions will not be machine-translated without a reviewed terminology strategy.
