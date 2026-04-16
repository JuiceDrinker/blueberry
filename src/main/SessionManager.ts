const MAX_EVENTS = 500;
const MAX_SCREENSHOT_AGE_MS = 10 * 60 * 1000; // 10 minutes
export type SessionEventType =
  | "tab-created"
  | "tab-closed"
  | "tab-switched"
  | "navigation"
  | "title-updated"
  | "window-focused"
  | "window-blurred"
  | "screenshot";

export type ScreenshotReason =
  | "navigation"
  | "tab-switch"
  | "window-focus"
  | "idle-dwell";

export interface SessionEvent {
  timestamp: number;
  type: SessionEventType;
  tabId: string;
  url?: string;
  title?: string;
  screenshot?: string;
  reason?: ScreenshotReason;
}

export type EventListener = (event: SessionEvent) => void;

export class SessionManager {
  private events: SessionEvent[] = [];
  private listeners: EventListener[] = [];

  logEvent(event: Omit<SessionEvent, "timestamp">): void {
    const fullEvent: SessionEvent = { ...event, timestamp: Date.now() };
    this.events.push(fullEvent);
    const { screenshot, ...rest } = fullEvent;
    console.log("[Session]", {
      ...rest,
      ...(screenshot ? { screenshot: `<${screenshot.length} bytes>` } : {}),
    });
    for (const listener of this.listeners) {
      listener(fullEvent);
    }
    this.pruneEvents();
  }

  private pruneEvents(): void {
    if (this.events.length > MAX_EVENTS) {
      this.events = this.events.slice(-MAX_EVENTS);
    }
    const cutoff = Date.now() - MAX_SCREENSHOT_AGE_MS;
    for (const event of this.events) {
      if (event.screenshot && event.timestamp < cutoff) {
        event.screenshot = undefined;
      }
    }
  }

  onEvent(listener: EventListener): void {
    this.listeners.push(listener);
  }

  getEvents(): SessionEvent[] {
    return this.events;
  }

  clear(): void {
    this.events = [];
  }
}
