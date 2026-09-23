# My Study Hub UI Design System — v2.5.0

## Direction

My Study Hub is a local developer-oriented learning workspace, not a consumer productivity dashboard.
The UI should feel closer to an IDE, GitHub, database client, or internal engineering tool.

## Principles

- Dense but readable information hierarchy.
- Flat surfaces instead of oversized decorative cards.
- Dark graphite background and restrained color accents.
- Monospace for paths, tags, codes, metadata, hashes, and technical labels.
- Minimal rounded corners (usually 6–8px).
- No gradients, glassmorphism, decorative illustrations, or marketing copy.
- English-only UI.
- Use color mainly for state, not decoration.

## Core colors

- Canvas: `#0b0f14`
- Surface: `#11161d`
- Elevated surface: `#161b22`
- Border: `#242c37`
- Primary text: `#e6edf3`
- Secondary text: `#8b949e`
- Blue: `#58a6ff`
- Cyan: `#39c5cf`
- Green: `#3fb950`
- Amber: `#d29922`
- Red: `#f85149`

## Typography

- Main UI: Inter Variable.
- Technical metadata: `ui-monospace`, `SFMono-Regular`, `Consolas`, monospace.
- Keep page titles compact; avoid hero-sized text.

## Layout

- Sidebar: ~214px.
- Top bar: ~56px.
- Content uses compact panels/tables.
- Prefer rows and split panes over large card grids when data is relational.

## New v2.5 surfaces

### Semester Folder Import

Workflow:

`folder -> scan -> classify -> preview -> import/sync`

The preview must show Subject, Route, file path, and state (`new`, `changed`, `unchanged`, `duplicate`, `unmatched`) before writing data.

### Tags

Render as technical tokens: `#java`, `#rag`, `#database`.
Direct and inherited tags participate in Explore filters.

### Explore

Acts like a global indexed workspace. Filters: query, tag, type, semester. Results are compact rows, not large cards.
