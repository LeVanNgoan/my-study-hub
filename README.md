# My Study Hub — Local-first v2

A personal desktop study management system designed around **manual setup + deep study history**.

## Core principles

- No account / login.
- No cloud database.
- No Supabase.
- No pre-seeded curriculum.
- No automatic subject generation.
- You manually create every Semester and Subject.
- Native app data is stored locally using SQLite.
- Uploaded files are copied into My Study Hub's local data folder.
- Backup/restore is built into the app.

## Data model

```text
Semester
└── Subject
    ├── Overview
    ├── Lecturer
    ├── Materials
    ├── Study Notes
    │   └── Critical Notes
    ├── Reports
    │   ├── Team Members
    │   └── Files
    └── Grade Scheme
        └── Grade Components
```

## Study Note filename convention

The filename parser supports:

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
- 11/09/2026

This convention is optional. Notes can always be entered manually.

## Native storage

The native Tauri app stores data under the OS application data directory:

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

The exact path is visible from **Settings → Storage**.

## Browser preview mode

`npm run dev` also works outside Tauri. In that mode the app automatically falls back to browser `localStorage` so UI and workflows can be tested without SQLite/Rust.

Browser preview is only for development. The real desktop build uses SQLite + local files.

## Build Windows `.exe` bằng GitHub Actions

Project đã có sẵn 2 workflow:

- `.github/workflows/build-windows.yml`: build `.exe` và lưu trong Actions Artifact.
- `.github/workflows/release-windows.yml`: build và publish `.exe` vào GitHub Release khi push tag `v*`.

Xem hướng dẫn chi tiết trong `GITHUB_BUILD_VI.md`.
