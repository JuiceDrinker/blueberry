import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import type { WebContents } from "electron";
import type { SessionEvent, SessionManager } from "./SessionTracker";

const MODEL_NAME = process.env.FOCUS_AGENT_MODEL || "gpt-4o";
const MAX_SCREENSHOTS_PER_CALL = 8;

// Auto-trigger heuristics
const DRIFT_WINDOW_MS = 2 * 60 * 1000; // 2 minute rolling window
const MIN_TAB_SWITCHES_FOR_DRIFT = 8;
const MIN_UNIQUE_DOMAINS_FOR_DRIFT = 3;
const COOLDOWN_MS = 60 * 1000; // Don't auto-trigger more than once per minute

const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(["in_progress", "abandoned", "completed"]),
  tabIds: z.array(z.string()),
  nextStep: z.string().nullable(),
});

const distractionSchema = z.object({
  tabId: z.string(),
  domain: z.string(),
});

const taskListSchema = z.object({
  tasks: z.array(taskSchema),
  distractions: z.array(distractionSchema),
  driftDetected: z.boolean(),
  nudge: z.string().nullable(),
});

export type Task = z.infer<typeof taskSchema>;
export type Distraction = z.infer<typeof distractionSchema>;
export type TaskList = z.infer<typeof taskListSchema>;

const SYSTEM_PROMPT = `You are Focus Flow, an assistant embedded in a web browser that helps users keep track of what they are trying to accomplish.

You will be given:
1. A list of currently open tabs (these are the tabs that exist RIGHT NOW)
2. A chronological log of browsing events (tab opens, tab switches, navigations, window focus changes)
3. A set of recent screenshots from the user's browsing session

IMPORTANT: Only reference tab IDs that appear in the currently open tabs list. Tabs that were closed are no longer relevant — do not include them in tasks or distractions.

Your job is to:
1. Infer the distinct TASKS the user appears to be working on based on the URLs, titles, and visual content of the pages. Pay close attention to the actual content visible in screenshots — read specific details like destinations, dates, names, prices, form fields, and search queries. Don't just rely on page titles.
2. For each task, decide its status:
   - "in_progress": the user is actively working on this or has clear intent to return
   - "abandoned": the user started this but got pulled away without finishing
   - "completed": appears finished based on evidence
3. Assign the relevant tab IDs to each task.
4. For each in_progress or abandoned task, provide a short, actionable "nextStep" — what should the user do next to make progress? Be specific: "Compare the two cheapest flights on Skyscanner" not "Continue searching for flights." For completed tasks, set nextStep to null.
5. IMPORTANT: Do NOT include distractions (social media, news for entertainment, Reddit, Twitter, YouTube, Hacker News, etc.) in the tasks array. Instead, put them in the separate "distractions" array with just the tabId and domain name. Only include a site as a task if there's clear evidence the user is researching something specific there.
6. Look for contradictions or incoherence across tasks. For example, if the user is booking flights to Tokyo but searching for accommodation in a completely different city, flag this in the nudge.
7. Detect whether the user looks scattered — switching between unrelated tasks without finishing them, getting pulled into distractions, revisiting the same pages without progressing, or showing signs of restlessness.
8. If drift is detected, write a short, specific, helpful nudge referencing a concrete task and concrete details from the screenshots. Not generic. Not preachy. Like a thoughtful colleague saying "hey, you were in the middle of X, want to get back to that?"

Be concrete and observant. Use specific details from the screenshots — city names, search queries, prices, form states. Do not invent tasks that aren't supported by the evidence. If the session is short or unclear, it's fine to return fewer tasks and driftDetected: false.`;

export interface OpenTab {
  id: string;
  url: string;
  title: string;
}

export class FocusAgent {
  private sessionManager: SessionManager;
  private sidebarWebContents: WebContents | null = null;
  private lastTaskList: TaskList | null = null;
  private lastAutoTriggerTime = 0;
  private isGenerating = false;
  private onAutoTrigger: (() => void) | null = null;
  private getOpenTabs: (() => OpenTab[]) | null = null;

  constructor(sessionManager: SessionManager) {
    this.sessionManager = sessionManager;
    this.sessionManager.onEvent((event) => this.checkDriftHeuristic(event));
  }

  setSidebarWebContents(webContents: WebContents): void {
    this.sidebarWebContents = webContents;
  }

  setAutoTriggerCallback(callback: () => void): void {
    this.onAutoTrigger = callback;
  }

  setOpenTabsProvider(provider: () => OpenTab[]): void {
    this.getOpenTabs = provider;
  }

  getLastTaskList(): TaskList | null {
    return this.lastTaskList;
  }

  private checkDriftHeuristic(_event: SessionEvent): void {
    if (this.isGenerating) return;

    const now = Date.now();
    if (now - this.lastAutoTriggerTime < COOLDOWN_MS) return;

    const events = this.sessionManager.getEvents();
    const recentEvents = events.filter(
      (e) => now - e.timestamp < DRIFT_WINDOW_MS
    );

    const tabSwitches = recentEvents.filter(
      (e) => e.type === "tab-switched"
    ).length;

    const uniqueDomains = new Set(
      recentEvents
        .filter((e) => e.type === "navigation" && e.url)
        .map((e) => {
          try {
            return new URL(e.url!).hostname;
          } catch {
            return null;
          }
        })
        .filter(Boolean)
    );

    if (
      tabSwitches >= MIN_TAB_SWITCHES_FOR_DRIFT &&
      uniqueDomains.size >= MIN_UNIQUE_DOMAINS_FOR_DRIFT
    ) {
      console.log(
        `[FocusAgent] Drift detected: ${tabSwitches} tab switches, ${uniqueDomains.size} domains in last 2 min`
      );
      this.lastAutoTriggerTime = now;
      this.onAutoTrigger?.();
    }
  }

  async generateTaskList(): Promise<TaskList | null> {
    if (this.isGenerating) {
      console.log("[FocusAgent] Already generating — skipping.");
      return null;
    }

    const events = this.sessionManager.getEvents();
    const navigationEvents = events.filter((e) => e.type === "navigation");
    if (navigationEvents.length < 3) {
      console.log("[FocusAgent] Not enough browsing activity yet — skipping.");
      return null;
    }

    this.isGenerating = true;
    const screenshots = this.pickScreenshots(events);
    const eventLog = this.serializeEventLog(events);
    const openTabs = this.getOpenTabs?.() ?? [];
    const openTabsSummary = openTabs
      .map((t) => `${t.id}: ${t.url} "${t.title}"`)
      .join("\n");
    const previousTaskList = this.lastTaskList
      ? `\n\nPrevious task list (update this, don't start from scratch):\n${JSON.stringify(this.lastTaskList, null, 2)}`
      : "";

    console.log(
      `[FocusAgent] Generating task list from ${events.length} events, ${screenshots.length} screenshots, ${openTabs.length} open tabs...`
    );

    try {
      const { object } = await generateObject({
        model: openai(MODEL_NAME),
        schema: taskListSchema,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Currently open tabs:\n${openTabsSummary}${previousTaskList}\n\nBrowsing event log (most recent last):\n\n${eventLog}`,
              },
              ...screenshots.map((shot) => ({
                type: "text" as const,
                text: `Screenshot from ${shot.tabId} (${shot.reason}) — ${shot.title || "untitled"} — ${shot.url || ""}`,
              })),
              ...screenshots.map((shot) => ({
                type: "image" as const,
                image: shot.screenshot,
              })),
              {
                type: "text",
                text: "Based on the event log and screenshots, produce the structured task list.",
              },
            ],
          },
        ],
      });

      console.log("[FocusAgent] Task list:", JSON.stringify(object, null, 2));
      this.lastTaskList = object;
      this.pushToSidebar(object);
      return object;
    } catch (err) {
      console.error("[FocusAgent] generateTaskList failed:", err);
      return null;
    } finally {
      this.isGenerating = false;
    }
  }

  private pickScreenshots(events: SessionEvent[]): Array<{
    tabId: string;
    url?: string;
    title?: string;
    reason?: string;
    screenshot: string;
  }> {
    const MIN_DATA_URL_LENGTH = 100;
    const screenshotEvents = events.filter(
      (e) =>
        e.type === "screenshot" &&
        e.screenshot &&
        e.screenshot.length > MIN_DATA_URL_LENGTH
    );
    return screenshotEvents
      .slice(-MAX_SCREENSHOTS_PER_CALL)
      .map((e) => ({
        tabId: e.tabId,
        url: e.url,
        title: e.title,
        reason: e.reason,
        screenshot: e.screenshot!,
      }));
  }

  private serializeEventLog(events: SessionEvent[]): string {
    const start = events[0]?.timestamp ?? Date.now();
    return events
      .filter((e) => e.type !== "screenshot")
      .map((e) => {
        const relativeMs = e.timestamp - start;
        const seconds = Math.round(relativeMs / 1000);
        const parts = [`+${seconds}s`, e.type, e.tabId];
        if (e.url) parts.push(e.url);
        if (e.title) parts.push(`"${e.title}"`);
        return parts.join(" | ");
      })
      .join("\n");
  }

  private pushToSidebar(taskList: TaskList): void {
    if (this.sidebarWebContents) {
      this.sidebarWebContents.send("task-list-updated", taskList);
    }
  }
}
