# TODO

A living checklist of everything needed to bring Grapple Legacy to a production-worthy state.

Priority scale: 🔴 High · 🟡 Medium · 🟢 Low

---

## 🧪 Testing

| Priority | Task |
|---|---|
| 🔴 | Set up a test framework (Vitest recommended — works with the existing esbuild/TS stack) |
| 🔴 | Unit tests for `LevelLoader` — pixel parsing, platform extraction, flag/spawn detection |
| 🔴 | Unit tests for `GrappleHook` — fire, reel, wrap, unwrap logic |
| 🟡 | Unit tests for `Player` — movement, jump buffering, coyote time |
| 🟡 | Integration tests for scene transitions (menu → game → pause → resume) |
| 🟢 | E2E tests for the Electron app using Playwright + `electron` driver |

---

## 🔧 Build & CI/CD

| Priority | Task |
|---|---|
| 🔴 | GitHub Actions CI — run build + tests on every push and pull request |
| 🔴 | Remove hardcoded `win.webContents.openDevTools()` from `main.ts` for production builds |
| 🟡 | Add `electron-builder` config for producing installers (Windows NSIS, macOS DMG, Linux AppImage) |
| 🟡 | Release pipeline — GitHub Actions workflow that builds and attaches installers to a GitHub Release on tag push |
| 🟡 | Add app icon assets and wire them into `electron-builder` |
| 🟢 | Code signing — Windows Authenticode cert, macOS Developer ID cert |
| 🟢 | Auto-updater via `electron-updater` so shipped builds can update themselves |

---

## 🔒 Security

| Priority | Task |
|---|---|
| 🔴 | Add a preload script with `contextBridge` — currently the renderer calls `window.close()` directly with no IPC boundary |
| 🔴 | Add `pnpm audit` step to CI to catch vulnerable dependencies on every build |
| 🟡 | Formal Electron security checklist review (`webSecurity`, `allowRunningInsecureContent`, `experimentalFeatures`, `nodeIntegration` in any child windows) |
| 🟡 | Switch from `^` semver ranges to pinned versions (or use a lockfile-only install policy in CI) |
| 🟢 | CSP smoke test — verify the Content-Security-Policy header is actually enforced at runtime |

---

## 📏 Code Quality

| Priority | Task |
|---|---|
| 🔴 | Add ESLint with `@typescript-eslint` — currently no static analysis beyond `tsc` |
| 🔴 | Audit `tsconfig.json` — enable `strict: true` and fix any resulting errors |
| 🟡 | Add Prettier and agree on a code style (or defer to ESLint's `--fix`) |
| 🟡 | Add Husky + lint-staged so ESLint/Prettier run as a pre-commit hook |
| 🟡 | Deduplicate `LEVEL_COUNT` — it is currently defined separately in both `GameScene.ts` and `LevelSelectScene.ts`; extract to a shared constants file |
| 🟢 | Standardise import style — some imports use `.js` extensions, others do not |

---

## 📦 Packaging & Distribution

| Priority | Task |
|---|---|
| 🟡 | Add a `LICENSE` file |
| 🟡 | Add a `CHANGELOG.md` and decide on a versioning strategy (SemVer recommended) |
| 🟡 | Document the release/build process in `README.md` |
| 🟢 | Add a `CONTRIBUTING.md` — setup steps, branch conventions, PR process |

---

## 💾 Persistence & State

| Priority | Task |
|---|---|
| 🟡 | Save system — persist level completion progress between sessions (Electron can use `app.getPath('userData')`) |
| 🟡 | Settings persistence — save and restore any settings the player changes |
| 🟢 | Level completion tracking — record best time or completion state per level |
| 🟢 | High score / speedrun timer display in-game |

---

## 🎮 Game Completeness

| Priority | Task |
|---|---|
| 🔴 | Audio system — SFX (grapple fire, swing whoosh, landing) and background music (noted in README) |
| 🟡 | More levels — `LEVEL_COUNT` is 1; Level Select UI is already built and ready |
| 🟡 | Settings screen — implement actual options (volume, fullscreen toggle, keybind display) |
| 🟡 | Main menu background — idle animation or parallax preview of the game world |
| 🟢 | Level transition animation — something between level complete and next level loading |
| 🟢 | Credits screen |

---

## 🐛 Error Handling & Observability

| Priority | Task |
|---|---|
| 🔴 | Graceful asset load failure — if a level image fails to load, show an error screen rather than crashing silently |
| 🟡 | Renderer error boundary — catch and display uncaught exceptions in the Phaser renderer |
| 🟢 | Logging strategy — structured logs in development, suppressed or sent to a file in production |
| 🟢 | Crash reporting — integrate something like Sentry for Electron to capture unhandled errors in the wild |

---

## 🧹 Developer Experience

| Priority | Task |
|---|---|
| 🟡 | Hot reload — configure esbuild `--watch` to trigger an Electron renderer reload without restarting the whole process |
| 🟡 | Source maps — enable in the esbuild renderer bundle so stack traces in DevTools point to TypeScript source |
| 🟢 | Separate `dev` and `prod` build configs — e.g. DevTools open, verbose logging, and debug physics only in dev |
