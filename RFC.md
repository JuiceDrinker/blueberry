# Focus Flow — Browsing Awareness & Intent Recovery

## Problem

Modern browsing sessions are chaotic. You open a tab to book a flight, then check an email notification, which leads to a Slack link, which leads to a blog post, and 20 minutes later you have 14 tabs open and no flight booked.

Existing tools (tab managers, screen time trackers, site blockers) treat symptoms, not causes. They either limit access or show you stats after the fact. None of them understand _what you were trying to do_ or help you get back to it in the moment.

## What Focus Flow does

Focus Flow is a background system that observes browsing behaviour, uses a vision model to infer what tasks the user is working on, detects when they've become scattered, and surfaces a dynamic todo list with actionable next steps.

### Core features

1. **Session tracking** — every tab switch, navigation, and page load is logged with timestamps. Screenshots are captured at meaningful moments (after navigation, on tab switch, on idle dwell, on window focus) and resized for efficiency.

2. **LLM-powered task inference** — the event log and screenshots are sent to a vision model (GPT-4o) which returns a structured task list: what the user is working on, what status each task is in, what distractions have crept in, and a concrete next step for each task.

3. **Drift detection** — a lightweight heuristic engine monitors the event stream. When it detects 8+ tab switches across 3+ domains in a 2-minute window, it automatically triggers the task list to appear.

4. **Distraction blocking** — the user can "focus" on a specific task, which blocks known distraction domains (Reddit, Twitter, YouTube, etc.) at the network level. A branded blocked page tells them what task they committed to finishing. Unblocking happens when they mark the task as done.

5. **Chat handoff** — clicking a task's suggested next step switches to the relevant tab and opens the sidebar chat with the next step pre-loaded as a message, giving the user guided assistance with the page visible.

## Architecture

```
Tab (navigation, screenshots)
  → SessionManager (append-only event log with pruning)
    → FocusAgent (drift heuristics + LLM task inference, EventEmitter)
      → Window (forwards events to sidebar via IPC)
        → FocusPanel (renders task list, manages local UI state)

DistractionBlocker (standalone, intercepts requests via Electron session API)
```

### Key design decisions

- **Event sourcing** — SessionManager maintains an immutable, append-only log. Screenshots are pruned after 10 minutes and the log is capped at 500 events to bound memory.
- **EventEmitter pattern** — FocusAgent extends Node's EventEmitter and emits `loading`, `task-list-updated`, and `drift-detected` events. Window subscribes and forwards to the renderer via IPC. No direct coupling between FocusAgent and the sidebar.
- **Structured LLM output** — uses Vercel AI SDK's `generateObject` with a Zod schema to guarantee typed, parseable responses from the vision model. No regex parsing or prompt-engineering for JSON.
- **Single trigger path** — both manual (icon click) and automatic (drift detection) triggers go through `Window.triggerFocusAgent()`, eliminating duplicated logic.
- **Background updates** — when the task list already exists, re-triggers show a subtle spinner in the header rather than replacing the content with a loading screen.
- **Open tabs context** — the LLM receives the list of currently open tabs alongside the event log, so closed tabs don't appear as phantom entries.

### Components

| File | Responsibility |
|------|----------------|
| `SessionManager.ts` | Append-only event log with listener support and memory pruning |
| `Tab.ts` | Captures navigation/title events and debounced screenshots |
| `FocusAgent.ts` | Drift heuristics, LLM task inference, EventEmitter |
| `DistractionBlocker.ts` | URL-level blocking via Electron's webRequest API |
| `Window.ts` | Composition root, wires components, forwards events to renderer |
| `EventManager.ts` | Thin IPC routing layer |
| `FocusPanel.tsx` | Task list UI with focus, dismiss, complete, and chat handoff actions |

## What I'd build next

- **Computer use** — clicking "next step" executes the action directly via browser automation instead of handing off to chat
- **Persistent memory** — save event logs across sessions so the agent can recall past browsing and spot recurring patterns
- **Smart blocking** — instead of a hardcoded distraction list, let the LLM decide what's a distraction based on the current task context
- **Pomodoro integration** — time-boxed focus blocks with automatic unblocking
- **Deeper page understanding** — detect unfilled forms, scroll progress, reading time via content script injection
