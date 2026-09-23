# My Study Hub v2.5.0 — Developer Workspace

v2.5 turns My Study Hub into a more technical, local-first study index.

## New core features

### Semester Folder Import
Import an entire semester directory instead of adding files one by one.

Recommended structure:

```text
FALL2026/
├── SWR302/
│   ├── Study Notes/
│   ├── Slides/
│   └── Reports/
├── CSD201/
└── PRJ301/
```

The import engine:
- matches files to existing subjects by subject code/name,
- detects Study Notes, Materials, and Report Files,
- parses `WWSS-DDMMYY.txt` study-note filenames,
- computes SHA-256 hashes,
- marks files as New / Changed / Unchanged / Duplicate / Unmatched,
- imports only selected new/changed files,
- keeps import history in SQLite so the same semester folder can be synced again later.

### Tags + inherited filtering
Subjects and Study Projects can now have tags such as:

```text
#java #backend #database #ai #rag
```

Content inherits its parent tags in Explore. Tagging `PRJ301` with `#java` makes its notes, materials, reports, and critical knowledge discoverable under the Java filter without tagging every item manually.

### Explore
A new developer-oriented index page supports filtering by:
- tag,
- content type,
- semester,
- free-text query.

It covers Academic and Self-Study content in one graph-like index.

## UI direction
The v2.5 interface is intentionally less consumer-oriented:
- dark graphite workspace,
- compact IDE-like navigation,
- mono labels and paths,
- flat panels with thin borders,
- minimal radii and decoration,
- blue/cyan/green technical accents,
- denser table/list layouts.

The app remains local-only and requires no account or cloud backend.
