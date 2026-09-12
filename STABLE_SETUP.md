# My Study Hub 2.2.0 — Stable Windows Setup

This edition is packaged as a normal Windows application.

## What “install once” means

1. Download `My Study Hub_*_x64-setup.exe` from GitHub Actions or Releases.
2. Run the setup file once.
3. Open **My Study Hub** from the Windows Start Menu whenever you need it.
4. You do **not** need Node.js, Rust, Git, a terminal, Supabase, or an internet connection to use the installed app.

The setup bundles the WebView2 offline installer so the installation does not depend on WebView2 already being available on the PC. This makes the setup larger, but more self-contained.

## Local data safety

Your database and study files are stored under the application's Windows App Data directory, not inside the installation directory. Installing a newer My Study Hub setup replaces the application files but keeps the same local study data as long as the identifier remains `com.local.mystudyhub`.

The app also:

- uses SQLite WAL mode;
- waits for temporary SQLite locks instead of immediately failing;
- uses stronger SQLite synchronous writes;
- allows only one running My Study Hub instance at a time;
- includes Backup and Restore in Settings.

## GitHub build

Push to `main` and open:

`GitHub → Actions → Build Windows EXE`

Download the artifact named approximately:

`My-Study-Hub-Setup-Windows-...`

Inside it, use only the file ending in:

`-setup.exe`

## Recommended release flow

For a version you want to keep:

```bash
git tag v2.2.0
git push origin v2.2.0
```

Then download the setup from **GitHub → Releases**.

## Important

Do not change the Tauri identifier `com.local.mystudyhub` in future versions. Changing it would cause Windows/Tauri to treat the app as a different application and would also change its application-data location.
