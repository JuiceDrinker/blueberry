import { NativeImage, WebContentsView } from "electron";
import type { ScreenshotReason, SessionManager } from "./SessionTracker";

const NAVIGATION_SCREENSHOT_DEBOUNCE_MS = 1500;
const IDLE_DWELL_MS = 15000;
const SCREENSHOT_WIDTH = 800;

export class Tab {
  private webContentsView: WebContentsView;
  private _id: string;
  private _title: string;
  private _url: string;
  private _isVisible: boolean = false;
  private sessionManager: SessionManager;
  private navigationScreenshotTimer: NodeJS.Timeout | null = null;
  private idleDwellTimer: NodeJS.Timeout | null = null;

  constructor(
    id: string,
    sessionManager: SessionManager,
    url: string = "https://www.google.com"
  ) {
    this._id = id;
    this._url = url;
    this._title = "New Tab";
    this.sessionManager = sessionManager;

    // Create the WebContentsView for web content only
    this.webContentsView = new WebContentsView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true,
      },
    });

    // Set up event listeners
    this.setupEventListeners();

    // Load the initial URL
    this.loadURL(url);
  }

  private setupEventListeners(): void {
    this.webContentsView.webContents.on("page-title-updated", (_, title) => {
      this._title = title;
      this.sessionManager.logEvent({
        type: "title-updated",
        tabId: this._id,
        title,
        url: this._url,
      });
    });

    this.webContentsView.webContents.on("did-navigate", (_, url) => {
      this._url = url;
      this.sessionManager.logEvent({
        type: "navigation",
        tabId: this._id,
        url,
        title: this._title,
      });
      this.scheduleNavigationScreenshot();
      this.resetIdleDwellTimer();
    });

    this.webContentsView.webContents.on("did-navigate-in-page", (_, url) => {
      this._url = url;
      this.sessionManager.logEvent({
        type: "navigation",
        tabId: this._id,
        url,
        title: this._title,
      });
      this.scheduleNavigationScreenshot();
      this.resetIdleDwellTimer();
    });
  }

  private scheduleNavigationScreenshot(): void {
    if (this.navigationScreenshotTimer) {
      clearTimeout(this.navigationScreenshotTimer);
    }
    this.navigationScreenshotTimer = setTimeout(async () => {
      this.navigationScreenshotTimer = null;
      await this.captureAndLog("navigation");
    }, NAVIGATION_SCREENSHOT_DEBOUNCE_MS);
  }

  private resetIdleDwellTimer(): void {
    if (this.idleDwellTimer) {
      clearTimeout(this.idleDwellTimer);
    }
    this.idleDwellTimer = setTimeout(async () => {
      this.idleDwellTimer = null;
      if (this._isVisible) {
        await this.captureAndLog("idle-dwell");
      }
    }, IDLE_DWELL_MS);
  }

  async captureAndLog(reason: ScreenshotReason): Promise<void> {
    try {
      const image = await this.webContentsView.webContents.capturePage();
      const resized = image.resize({ width: SCREENSHOT_WIDTH });
      const dataUrl = resized.toDataURL();
      this.sessionManager.logEvent({
        type: "screenshot",
        tabId: this._id,
        url: this._url,
        title: this._title,
        screenshot: dataUrl,
        reason,
      });
    } catch (err) {
      console.error(`[Tab ${this._id}] screenshot failed:`, err);
    }
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get title(): string {
    return this._title;
  }

  get url(): string {
    return this._url;
  }

  get isVisible(): boolean {
    return this._isVisible;
  }

  get webContents() {
    return this.webContentsView.webContents;
  }

  get view(): WebContentsView {
    return this.webContentsView;
  }

  // Public methods
  show(): void {
    this._isVisible = true;
    this.webContentsView.setVisible(true);
  }

  hide(): void {
    this._isVisible = false;
    this.webContentsView.setVisible(false);
  }

  async screenshot(): Promise<NativeImage> {
    return await this.webContentsView.webContents.capturePage();
  }

  async runJs(code: string): Promise<any> {
    return await this.webContentsView.webContents.executeJavaScript(code);
  }

  async getTabHtml(): Promise<string> {
    return await this.runJs("return document.documentElement.outerHTML");
  }

  async getTabText(): Promise<string> {
    return await this.runJs("return document.documentElement.innerText");
  }

  loadURL(url: string): Promise<void> {
    this._url = url;
    return this.webContentsView.webContents.loadURL(url);
  }

  goBack(): void {
    if (this.webContentsView.webContents.navigationHistory.canGoBack()) {
      this.webContentsView.webContents.navigationHistory.goBack();
    }
  }

  goForward(): void {
    if (this.webContentsView.webContents.navigationHistory.canGoForward()) {
      this.webContentsView.webContents.navigationHistory.goForward();
    }
  }

  reload(): void {
    this.webContentsView.webContents.reload();
  }

  stop(): void {
    this.webContentsView.webContents.stop();
  }

  destroy(): void {
    if (this.navigationScreenshotTimer) {
      clearTimeout(this.navigationScreenshotTimer);
      this.navigationScreenshotTimer = null;
    }
    if (this.idleDwellTimer) {
      clearTimeout(this.idleDwellTimer);
      this.idleDwellTimer = null;
    }
    this.webContentsView.webContents.close();
  }
}
