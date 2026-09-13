# Hide Windows console — v2.3.1

Release builds now use the Windows GUI subsystem:

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
```

Result:

- Installed `My Study Hub.exe`: no CMD/console window.
- NSIS Setup: unaffected.
- `RUN_DESKTOP_DEV.cmd`: still opens a terminal because development mode needs logs.
- Debug builds keep the console available for troubleshooting.

After applying this patch, push to GitHub and rebuild the Windows Setup.
