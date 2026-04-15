export type SessionEventType =
  | "tab-created"
  | "tab-closed"
  | "tab-switched"
  | "navigation"
  | "title-updated";

export interface SessionEvent {
  timestamp: number;
  type: SessionEventType;
  tabId: string;
  url?: string;
  title?: string;
}

export class SessionManager {
  private events: SessionEvent[] = [];

  logEvent(event: Omit<SessionEvent, "timestamp">): void {
    const fullEvent: SessionEvent = { ...event, timestamp: Date.now() };
    this.events.push(fullEvent);
    console.log("[Session]", fullEvent);
  }

  getEvents(): SessionEvent[] {
    return this.events;
  }

  clear(): void {
    this.events = [];
  }
}
