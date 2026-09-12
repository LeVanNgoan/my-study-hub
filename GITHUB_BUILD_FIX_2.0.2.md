# GitHub build fix 2.0.2

The failing line was:

```text
icons/icon.ico not found; required for generating a Windows Resource file during tauri-build
```

This patch adds the required Windows/Tauri icons and wires them into `tauri.conf.json`.

## Apply

Extract the patch into the root of your current Git repository and overwrite matching files.

Then run:

```text
PUSH_ICON_FIX_2.0.2.cmd
```

or manually:

```bash
git add .
git commit -m "Fix Tauri Windows icon build v2.0.2"
git push origin main
```

GitHub Actions will start again.

`package.metadata does not exist` is not the line that caused the build to stop.
