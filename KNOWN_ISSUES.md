# Known Issues & Trade-offs

Issues I'm aware of but chose not to fix for v1, with reasoning.

## Architecture

- **DistractionBlocker uses `session.defaultSession`** — this means blocking applies to all webContents including the sidebar and topbar, not just browsing tabs. In production, tabs should use a dedicated `Session` so blocking is scoped to page content only. For the demo with a single window this works fine.

- **IPC handlers in EventManager are global singletons** — `ipcMain.handle` registers once globally. If multiple windows were created, registration would fail. The `cleanup()` method also only removes `.on` listeners, not `.handle` handlers. This is a single-window app for now.

- **No listener unsubscribe on SessionManager** — `onEvent()` pushes to an array with no removal mechanism. If consumers are recreated without the SessionManager, old listeners leak. Fine for the current lifecycle where everything is created once.

- **Duplicate type definitions** — `TaskList`, `Task`, `Distraction` are defined independently in the main process (Zod schemas) and renderer (TypeScript interfaces). In production these should be shared types to prevent drift.

## Security

- **`tab-run-js` IPC channel** — pre-existing in the codebase, not added by me. Allows arbitrary JS execution in any tab from the topbar renderer. Should be gated or removed in production.

## Robustness

- **Race condition on concurrent triggers** — if auto-trigger and manual trigger fire simultaneously, the second call returns `null` silently. The sidebar could show a loading spinner that never resolves. Should either queue the second call or send a "skipped" event to clear loading state.

- **Screenshots on hidden tabs** — `scheduleNavigationScreenshot` sets a 1.5s timer that isn't cancelled when a tab is hidden (only on destroy). Capturing a hidden tab returns an empty image, which is handled but wastes resources.

- **React strict mode listener stacking** — in dev mode, `useEffect` runs twice, which could stack IPC listeners. `removeAllListeners` on cleanup is a blunt fix. Production builds are unaffected.

- **Task completion state not synced to LLM** — when a user marks a task as "done" locally, this isn't persisted. On re-trigger, the LLM receives the previous task list but may regenerate the completed task. The local UI state and LLM state can diverge.

## Pre-existing issues in the codebase

- **`getTabHtml` / `getTabText` use `return` in `executeJavaScript`** — `return document.documentElement.outerHTML` is invalid at the top level of a script evaluation. Should be just the expression without `return`.

- **`createTab` hardcodes 400px sidebar width** — new tabs always subtract 400px for sidebar regardless of visibility. Corrected on next resize via `updateTabBounds`, but initial render is wrong when sidebar is hidden.
