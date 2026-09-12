# My Study Hub — UI Design System v2.3

## Frontend stack

- React 18
- TypeScript
- Tailwind CSS 3
- Lucide React icons
- Inter Variable bundled locally through `@fontsource-variable/inter`
- Vite
- Tauri 2 desktop shell

No remote font, CDN, image, or runtime UI dependency is required after the application is built.

## Visual direction

The interface uses a focused productivity aesthetic:

- deep navy navigation rail
- bright blue primary accent
- soft white cards over a cool neutral workspace
- 16–24 px rounded surfaces
- low-contrast borders rather than heavy shadows
- colored subject-card accents
- compact but readable typography
- clear hierarchy for semester, subject, note, and knowledge data

## UX priorities

1. The current semester should be visible immediately.
2. The dashboard should answer: what am I studying, what did I study recently, and what needs review?
3. Subject workspaces should feel like dedicated study spaces rather than database forms.
4. Study Notes and Critical Notes remain visually distinct.
5. Forms and modals should be quiet, predictable, and keyboard friendly.
6. All interface copy is English.
7. The desktop build remains local-first and offline-ready.

## Tailwind strategy

The existing React business logic is retained. Tailwind powers the visual system through component classes in `src/styles.css` using `@apply`, which keeps the JSX readable while still giving the project a consistent utility-first design foundation.
