import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import type { WebContents } from "electron";
import type { SessionEvent, SessionManager } from "./SessionTracker";

const MODEL_NAME = process.env.FOCUS_AGENT_MODEL || "gpt-4o";
const MAX_SCREENSHOTS_PER_CALL = 8;

const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(["in_progress", "abandoned", "completed"]),
  tabIds: z.array(z.string()),
  reasoning: z.string(),
});

const taskListSchema = z.object({
  tasks: z.array(taskSchema),
  driftDetected: z.boolean(),
  nudge: z.string().nullable(),
});

export type Task = z.infer<typeof taskSchema>;
export type TaskList = z.infer<typeof taskListSchema>;

const SYSTEM_PROMPT = `You are Focus Flow, an assistant embedded in a web browser that helps users keep track of what they are trying to accomplish.

You will be given a chronological log of browsing events (tab opens, tab switches, navigations, window focus changes) and a set of recent screenshots from the user's browsing session. Each screenshot is tagged with the tab it came from and the reason it was captured.

Your job is to:
1. Infer the distinct tasks the user appears to be working on based on the URLs, titles, and visual content of the pages. Pay close attention to the actual content visible in screenshots — read specific details like destinations, dates, names, prices, form fields, and search queries. Don't just rely on page titles.
2. For each task, decide its status:
   - "in_progress": the user is actively working on this or has clear intent to return
   - "abandoned": the user started this but got pulled away without finishing
   - "completed": appears finished based on evidence
3. Assign the relevant tab IDs to each task.
4. Distinguish between intentional tasks and distractions. Browsing social media (Reddit, Twitter, YouTube, Instagram, Hacker News), news sites for entertainment, or other passive consumption is NOT a task — it is a distraction. Only include it in the task list if there's clear evidence the user is researching something specific on that site. Label distractions with status "abandoned" and make this clear in the reasoning.
5. Look for contradictions or incoherence across tasks. For example, if the user is booking flights to Tokyo but searching for accommodation in a completely different city, flag this — it might indicate confusion or a mistake.
6. Detect whether the user looks scattered — switching between unrelated tasks without finishing them, getting pulled into distractions, revisiting the same pages without progressing, or showing signs of restlessness.
7. If drift is detected, write a short, specific, helpful nudge referencing a concrete task and concrete details from the screenshots. Not generic. Not preachy. Like a thoughtful colleague saying "hey, you were in the middle of X, want to get back to that?"

Be concrete and observant. Use specific details from the screenshots — city names, search queries, prices, form states. Do not invent tasks that aren't supported by the evidence. If the session is short or unclear, it's fine to return fewer tasks and driftDetected: false.

Each task needs a short "reasoning" field explaining why you grouped those tabs/events into that task — this helps us debug and tune the agent.`;

export class FocusAgent {
  private sessionManager: SessionManager;
  private sidebarWebContents: WebContents | null = null;
  private lastTaskList: TaskList | null = null;

  constructor(sessionManager: SessionManager) {
    this.sessionManager = sessionManager;
  }

  setSidebarWebContents(webContents: WebContents): void {
    this.sidebarWebContents = webContents;
  }

  getLastTaskList(): TaskList | null {
    return this.lastTaskList;
  }

  async generateTaskList(): Promise<TaskList | null> {
    const events = this.sessionManager.getEvents();
    if (events.length === 0) {
      console.log("[FocusAgent] No events yet — skipping.");
      return null;
    }

    const screenshots = this.pickScreenshots(events);
    const eventLog = this.serializeEventLog(events);

    console.log(
      `[FocusAgent] Generating task list from ${events.length} events, ${screenshots.length} screenshots...`
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
                text: `Here is the browsing event log (most recent last):\n\n${eventLog}`,
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
