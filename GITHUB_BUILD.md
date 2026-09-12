# Build My Study Hub EXE with GitHub Actions

You do not need Rust or Tauri installed locally when using GitHub Actions.

## 1. Push the project to GitHub

Create a repository, then push this project to the `main` branch.

## 2. Build the Windows installer

Open:

**GitHub → Repository → Actions → Build Windows EXE**

The workflow also runs automatically after a push to `main` or `master`.

When the workflow completes successfully, download the artifact named similar to:

```text
My-Study-Hub-Windows-<commit>
```

The recommended file is the NSIS installer:

```text
My Study Hub_2.1.0_x64-setup.exe
```

## 3. Create a GitHub Release

```powershell
git tag v2.1.0
git push origin v2.1.0
```

The release workflow builds the Windows installer and attaches it to a GitHub Release.

## Troubleshooting

If a workflow fails, open the failed job and copy the first real compiler or bundler error. Warnings about line endings or deprecated Action runtimes are usually not the root cause.
