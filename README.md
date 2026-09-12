# My Study Hub — Local-first v2.1

A private desktop study management system built around **manual setup, deep study notes, and long-term knowledge retention**.

## Product principles

- No account or login.
- No cloud database.
- No preconfigured curriculum.
- No automatic subject generation.
- You manually create every Semester and Subject.
- Native desktop data is stored locally with SQLite.
- Uploaded files are copied into the app data folder.
- Backup and restore are built into the app.
- The entire interface is English.

## Core structure

```text
Semester
└── Subject
    ├── Overview
    ├── Study Notes
    ├── Materials
    ├── Critical Notes
    ├── Reports / Projects
    │   ├── Team Members
    │   └── Files
    ├── Lecturer
    └── Results
```

## Study Note filename convention

The optional filename parser supports:

```text
WWSS-DDMMYY.txt
```

Example:

```text
0102-110926.txt
```

is interpreted as:

- Week 01
- Slot 02
- 11 September 2026

Notes can always be entered manually, so the naming convention is never required.

## Native storage

```text
My Study Hub data folder/
├── studyhub.db
├── files/
│   └── <semester>/<subject>/
│       ├── materials/
│       ├── study-notes/
│       └── reports/
└── backups/
```

The exact path is available from **Settings → Storage**.

## Browser preview

```powershell
npm install
npm run dev
```

Browser preview uses `localStorage`. The native desktop build uses SQLite and local files.

## Build the Windows EXE with GitHub Actions

Two workflows are included:

- `.github/workflows/build-windows.yml` — builds the Windows NSIS installer and uploads it as an Actions artifact.
- `.github/workflows/release-windows.yml` — creates a GitHub Release when you push a `v*` tag.

See `GITHUB_BUILD.md` for the full process.
