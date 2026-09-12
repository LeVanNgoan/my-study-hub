# Quick Start — My Study Hub v2.1

## Browser preview

Requires Node.js 20 or newer.

```powershell
npm install
npm run dev
```

Open:

```text
http://localhost:1420
```

Preview mode uses browser `localStorage` and does not require a login or database server.

## Native desktop development

Install:

- Rust via rustup
- Microsoft C++ / Visual Studio Build Tools
- WebView2 Runtime

Then run:

```powershell
npm install
npm run tauri dev
```

The desktop app uses local SQLite storage and copies managed files into its own data folder.

## Build locally

```powershell
npm run tauri build
```

The installer is generated under:

```text
src-tauri\target\release\bundle\nsis\
```

## First-time setup inside the app

1. Open **Semesters**.
2. Click **Add Semester**.
3. Enter your own semester name, number, dates, and status.
4. Open that semester and click **Add Subject**.
5. Manage each subject through Overview, Study Notes, Materials, Critical Notes, Reports, Lecturer, and Results.

## Study Note import

A file named:

```text
0102-110926.txt
```

can automatically prefill:

```text
Week 01
Slot 02
Date 11/09/2026
```

## Backup

Open **Settings → Create Backup**. In desktop mode, the backup ZIP contains `studyhub.db` and the managed `files/` directory.
