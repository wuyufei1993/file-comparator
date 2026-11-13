# FileComparator

[简体中文](README.md) | English

A cross-platform desktop tool for comparing files and text, built with Tauri 2, React, and Monaco Editor.

## Download

Download the latest Windows installer (`.exe` or `.msi`) from [GitHub Releases](https://github.com/wuyufei1993/file-comparator/releases/latest). For macOS and Linux, build from source using the instructions below.

## Features

- **Unified comparison interface** — Type or paste text, or choose a local file on either side. Compare files, text, or a mix of both without switching modes.
- **Editable file contents** — Edit loaded contents and see differences in real time. The original files are never modified.
- **Integrated window controls** — The desktop toolbar includes minimize, maximize / restore, and close buttons. Drag an empty area of the toolbar to move the window, or double-click it to maximize / restore.
- **Side-by-side diff view** — See additions, deletions, and modifications in a familiar two-column layout.
- **Swap sides** — Exchange the original and modified contents with one click.
- **Clear all** — Reset both editors quickly.
- **Minimap navigation** — Locate differences in the document overview.
- **Chinese and English** — Switch the interface language and keep your preference between sessions.
- **Responsive layout** — Editors resize automatically with the window.
- **Difference navigation** — View the number of change blocks and added / removed lines. Use the previous / next buttons or `F7` / `Shift+F7` inside the editor.
- **Undo clear** — Restore cleared contents from the notification bar. Editing or loading a file dismisses this undo option.
- **Saved preferences** — Keep your choices for ignoring leading / trailing whitespace, word wrap, font size, minimap visibility, and interface language locally.
- **Offline editor** — Monaco and its workers are bundled with the app, with no CDN dependency. The editor loads on demand when you start a comparison.
- **File validation** — Read UTF-8 text files up to 10 MB, with feedback for binary files and encoding errors. Source files remain untouched.
- **Cross-platform** — Supports Windows, macOS, and Linux.

## Technology stack

| Layer | Technology |
|-------|------------|
| Desktop framework | Tauri 2 (Rust) |
| Frontend | React 18 + TypeScript |
| Comparison engine | Monaco Editor Diff |
| Build tool | Vite 5 |
| Icons | Lucide React |

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [Rust](https://www.rust-lang.org/tools/install) >= 1.77.2
- [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)

### Install and run

```bash
# Install dependencies
npm install

# Run the desktop app in development mode
npm run tauri dev

# Build production installers
npm run tauri build
```

### Web preview and deployment

Run the web version without Rust. It reads local text files through the browser's file picker:

```bash
npm ci
npm run dev
# Build for production and preview locally
npm run build
npm run preview -- --host 127.0.0.1
```

Deploy `dist/` to a static web server to host the web version. Serve it over HTTP(S) so editor workers load correctly. Desktop installers require Rust/Cargo and the Tauri build dependencies for the target platform. Windows also requires the MSVC C++ build tools and WebView2.

### App icon

`public/logo.svg` is the editable vector source. It depicts two documents side by side with comparison arrows. The interface and web favicon use the same icon; `src-tauri/icons/` contains the generated PNG, ICO, ICNS, and platform-specific sizes.

```bash
npm run tauri icon public/logo.svg
```

## Project structure

```text
file-comparator/
├── src/                    # React frontend source
│   ├── App.tsx             # Main application component
│   ├── App.css             # Compact toolbar, split editors, and settings styles
│   ├── ComparisonEditor.tsx # On-demand editor entry point
│   ├── monaco.ts           # Local Monaco and worker configuration
│   └── main.tsx            # Entry point
├── src-tauri/              # Tauri / Rust backend
│   ├── src/
│   │   ├── lib.rs          # Tauri plugin registration
│   │   └── main.rs         # Entry point
│   ├── Cargo.toml
│   └── tauri.conf.json     # Tauri configuration
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## Usage

Type or paste text into either editor, or load a file with the **Choose file** button above each side. No mode switching is required. Desktop window controls share the top toolbar with the main actions. Display options and difference navigation sit along the bottom, while language, font size, and minimap preferences are available in settings. Comparison contents are not retained after closing or refreshing the app.

## License

MIT
