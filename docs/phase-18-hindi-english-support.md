# Phase 18 — Hindi + English Support

Phase 18 adds an application-wide English/Hindi language layer without changing authentication, database, RLS, or clinical APIs.

## User experience

- The language selector is available in the shared application header.
- Supported locales:
  - `en` — English (default)
  - `hi` — Hindi (`हिन्दी`)
- The selection is saved in:
  - `hc_locale` browser cookie, for persistence across requests
  - `localStorage`, for immediate client restoration
- The document language is updated to `en` or `hi` for accessibility and browser semantics.
- Dates use `en-IN` or `hi-IN` formatting.

## Translation architecture

- `lib/i18n.ts` contains typed English/Hindi resources and a small safe lookup helper.
- `components/i18n/locale-provider.tsx` provides locale state through React context.
- `LanguageSwitcher` is rendered by `AppShell` and is available across all portals.
- Shared patient, doctor, collection-agent, and admin components consume the locale context.
- The patient AI assistant localizes its interface, safety notices, labels, and controls.

## Clinical safety boundary

The language layer does not machine-translate model-generated clinical responses, clinical notes, report contents, prescriptions, or medical instructions. Those values are rendered as returned by the authorized backend/provider. This avoids presenting an unreviewed translation as a clinical instruction. A reviewed medical terminology glossary or clinician-approved translation workflow should be added before translating clinical content.

## Validation

- `npx tsc --noEmit`
- `npm run build`
- Confirm the selector changes navigation/header labels between English and Hindi.
- Reload the page and confirm the selected language persists.
- Confirm AI safety notices remain visible in both languages and generated assistant responses are not altered by the translation layer.

## Next phase

Phase 19 is the security audit covering Auth, RLS, Storage, API authorization, IDOR/BOLA risks, upload security, session behavior, sensitive logging, and role-isolation testing.
