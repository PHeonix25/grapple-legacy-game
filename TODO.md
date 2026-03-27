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

---

## 🎮 Product & Features

*Thinking like a Product Owner, Game Reviewer, and a teenage boy who wants the game to go hard.*

### Game Feel & Juice
| Priority | Task |
|---|---|
| 🔴 | Screen shake on landing, death, and grapple impact |
| 🔴 | Rope trail / swing motion blur — make fast swings look cinematic |
| 🔴 | Particle effects — dust on landing, sparks on grapple hit, debris on death |
| 🟡 | Player squash & stretch on jump, land, and direction changes |
| 🟡 | Grapple hook travel animation — hook visibly flies out before attaching |
| 🟡 | "Miss" animation when the grapple fires and hits nothing |
| 🟢 | Dynamic camera — zoom out slightly during big swings, snap in on landing |

### Player Abilities & Movement
| Priority | Task |
|---|---|
| 🔴 | Wall jump — slide down walls and kick off them |
| 🟡 | Double jump — single mid-air jump as an optional power-up or baseline ability |
| 🟡 | Air dash — short burst of speed in any direction, cooldown-gated |
| 🟡 | Grapple swing boost — tap jump at the bottom of a swing to rocket upward |
| 🟢 | Momentum preservation — retain speed when releasing the grapple at high velocity |
| 🟢 | Grapple to enemies/moving objects — hook onto things that move |

### Progression & Content
| Priority | Task |
|---|---|
| 🔴 | More levels — at least 5–10 to form a proper game loop |
| 🔴 | Level timer — show elapsed time per level and a best-time record |
| 🟡 | World map / hub screen — visual level progression like classic platformers |
| 🟡 | Collectibles — hidden items in each level that reward exploration |
| 🟡 | Star/medal rating per level based on completion time (1–3 stars) |
| 🟢 | Unlockable bonus levels — complete all main levels to unlock harder variants |
| 🟢 | Daily challenge level — same seed rotates every 24 hours |

### Cosmetics & Personalisation
| Priority | Task |
|---|---|
| 🟡 | Unlockable player skins — earn them by completing levels or collecting items |
| 🟡 | Rope colour picker — let the player customise their grapple rope |
| 🟢 | Hook skin variants — different hook head designs (claw, magnet, anchor) |
| 🟢 | Trail effects — leave a colour trail behind the player during fast swings |

### Replayability & Competition
| Priority | Task |
|---|---|
| 🔴 | Speedrun mode — full-game timer, no HUD clutter, ghost replay of best run |
| 🟡 | Local leaderboard — top 10 times per level saved to disk |
| 🟡 | Ghost replay — record and replay the player's best run as a translucent ghost |
| 🟡 | Online leaderboard — submit times to a simple backend, view global top 10 |
| 🟢 | Replay share — export a replay file and share it with friends |

### Accessibility & QoL
| Priority | Task |
|---|---|
| 🟡 | Tutorial level or in-level hint system — teach grapple mechanics without a wall of text |
| 🟡 | Rebindable controls — let players remap keyboard and mouse buttons |
| 🟡 | Gamepad / controller support — full Xbox/PlayStation controller mapping |
| 🟡 | Colourblind mode — alternative palette for the rope, platforms, and UI |
| 🟢 | Practice mode — disable death, let players explore a level freely |

### Audio & Atmosphere
| Priority | Task |
|---|---|
| 🔴 | SFX — grapple fire, hook attach, swing whoosh, footstep, land thud, death |
| 🔴 | Background music — looping chiptune or lo-fi track per world/theme |
| 🟡 | Dynamic audio — music speeds up or intensifies when the player is moving fast |
| 🟡 | Ambient sounds — wind, echoes, environment-specific atmosphere |
| 🟢 | Grapple sound variants — different sounds for metal, wood, stone surfaces |
