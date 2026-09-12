# GitHub build fix — v2.0.1

GitHub Actions previously stopped in `src/App.tsx` because HTML `<select>` returns `string`, while React state was intentionally typed as a restricted union.

Fixed states:
- SemesterStatus
- SubjectStatus
- StudyNoteStatus
- GradeType

Each `<select>` value is now explicitly narrowed back to its corresponding union type.

The Node.js 20 deprecation line in GitHub Actions is only a warning from GitHub Actions' internal runtime. It is not the build failure.

## Apply to an existing repo

Replace `src/App.tsx` with the fixed file, then run:

```bat
git add src/App.tsx .gitattributes package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml
git commit -m "Fix TypeScript select state types"
git push
```

A new GitHub Actions run will start automatically.
