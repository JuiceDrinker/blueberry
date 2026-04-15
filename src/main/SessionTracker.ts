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

export class SessionManager {
  private events: SessionEvent[] = [];

  logEvent(event: Omit<SessionEvent, "timestamp">): void {
    const fullEvent: SessionEvent = { ...event, timestamp: Date.now() };
    this.events.push(fullEvent);
    const { screenshot, ...rest } = fullEvent;
    console.log("[Session]", {
      ...rest,
      ...(screenshot ? { screenshot: `<${screenshot.length} bytes>` } : {}),
    });
  }

  getEvents(): SessionEvent[] {
    return this.events;
  }

  clear(): void {
    this.events = [];
  }
}
