import { session, webContents } from "electron";

const DISTRACTION_DOMAINS = [
  "reddit.com",
  "twitter.com",
  "x.com",
  "youtube.com",
  "instagram.com",
  "facebook.com",
  "tiktok.com",
  "news.ycombinator.com",
  "twitch.tv",
  "discord.com",
  "bbc.com",
];

export class DistractionBlocker {
  private isBlocking = false;
  private focusedTaskTitle: string | null = null;
  private pendingBlockedPages: Set<number> = new Set();

  startBlocking(taskTitle: string): void {
    if (this.isBlocking) this.stopBlocking();

    this.focusedTaskTitle = taskTitle;
    this.isBlocking = true;

    session.defaultSession.webRequest.onBeforeRequest(
      { urls: ["*://*/*"] },
      (details, callback) => {
        if (details.resourceType !== "mainFrame") {
          callback({});
          return;
        }

        // Don't block data URLs (our own blocked page)
        if (details.url.startsWith("data:")) {
          callback({});
          return;
        }

        try {
          const url = new URL(details.url);
          const isDistraction = DISTRACTION_DOMAINS.some(
            (domain) =>
              url.hostname === domain || url.hostname.endsWith(`.${domain}`),
          );

          if (isDistraction) {
            console.log(`[Blocker] Blocked: ${url.hostname}`);
            callback({ cancel: true });
            if (details.webContentsId != null) {
              this.showBlockedPage(details.webContentsId, url.hostname);
            }
            return;
          }
        } catch {
          // Invalid URL, let it through
        }
        callback({});
      },
    );

    console.log(`[Blocker] Blocking distractions — focus on: "${taskTitle}"`);
  }

  private showBlockedPage(webContentsId: number, hostname: string): void {
    if (this.pendingBlockedPages.has(webContentsId)) return;
    this.pendingBlockedPages.add(webContentsId);

    // Defer the loadURL to avoid calling it inside the request handler
    setImmediate(() => {
      this.pendingBlockedPages.delete(webContentsId);
      try {
        const wc = webContents.fromId(webContentsId);
        if (wc) {
          const html = this.buildBlockedPage(hostname);
          wc.loadURL(
            `data:text/html;charset=utf-8,${encodeURIComponent(html)}`,
          );
        }
      } catch (err) {
        console.error("[Blocker] Failed to show blocked page:", err);
      }
    });
  }

  stopBlocking(): void {
    if (!this.isBlocking) return;

    session.defaultSession.webRequest.onBeforeRequest(null);
    this.pendingBlockedPages.clear();
    this.isBlocking = false;

    console.log(`[Blocker] Unblocked — finished: "${this.focusedTaskTitle}"`);
    this.focusedTaskTitle = null;
  }

  getState(): { isBlocking: boolean; focusedTaskTitle: string | null } {
    return {
      isBlocking: this.isBlocking,
      focusedTaskTitle: this.focusedTaskTitle,
    };
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  private buildBlockedPage(hostname: string): string {
    const safeHostname = this.escapeHtml(hostname);
    const safeTask = this.escapeHtml(
      this.focusedTaskTitle || "Your current task",
    );
    return `<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #fafafa;
      color: #141414;
    }
    .container {
      text-align: center;
      max-width: 400px;
      padding: 40px;
    }
    .emoji { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 20px; font-weight: 600; margin-bottom: 8px; }
    p { font-size: 14px; color: #737373; line-height: 1.5; }
    .task {
      margin-top: 16px;
      padding: 12px 16px;
      background: #f0f0f0;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
    }
    @media (prefers-color-scheme: dark) {
      body { background: #141414; color: #fafafa; }
      p { color: #a1a1a1; }
      .task { background: #282828; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="emoji">🫐</div>
    <h1>${safeHostname} is blocked</h1>
    <p>You asked Blueberry to help you focus. Finish your task first, then come back.</p>
    <div class="task">${safeTask}</div>
  </div>
</body>
</html>`;
  }
}
