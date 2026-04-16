import type { Window } from "./Window";

const SCENARIO = [
  {
    action: "navigate",
    url: "https://www.google.com/search?q=flights+stockholm+to+tokyo",
  },
  { action: "wait", ms: 2000 },
  { action: "new-tab", url: "https://www.bbc.com/news" },
  { action: "wait", ms: 3000 },
  { action: "switch", tabIndex: 0 },
  { action: "wait", ms: 1500 },
  { action: "navigate", url: "https://www.skyscanner.com" },
  { action: "wait", ms: 2500 },
  { action: "new-tab", url: "https://www.reddit.com" },
  { action: "wait", ms: 2000 },
  { action: "switch", tabIndex: 1 },
  { action: "wait", ms: 1000 },
  { action: "switch", tabIndex: 2 },
  { action: "wait", ms: 1500 },
  { action: "new-tab", url: "https://www.airbnb.com" },
  { action: "wait", ms: 3000 },
  { action: "switch", tabIndex: 0 },
  { action: "wait", ms: 1000 },
  { action: "switch", tabIndex: 3 },
  { action: "wait", ms: 2000 },
  { action: "switch", tabIndex: 2 },
  { action: "wait", ms: 500 },
  { action: "switch", tabIndex: 1 },
  { action: "wait", ms: 800 },
  { action: "switch", tabIndex: 3 },
] as const;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runSimulation(window: Window): Promise<void> {
  console.log("[Simulate] Starting browsing simulation...");

  const tabs = [window.allTabs[0]];

  for (const step of SCENARIO) {
    switch (step.action) {
      case "navigate": {
        const activeTab = tabs[tabs.length - 1];
        if (activeTab) {
          console.log(`[Simulate] Navigating to ${step.url}`);
          await activeTab.loadURL(step.url);
        }
        break;
      }
      case "new-tab": {
        console.log(`[Simulate] Opening new tab: ${step.url}`);
        const tab = window.createTab(step.url);
        tabs.push(tab);
        window.switchActiveTab(tab.id);
        break;
      }
      case "switch": {
        const tab = tabs[step.tabIndex];
        if (tab) {
          console.log(
            `[Simulate] Switching to tab ${step.tabIndex} (${tab.title})`,
          );
          window.switchActiveTab(tab.id);
        }
        break;
      }
      case "wait": {
        await sleep(step.ms);
        break;
      }
    }
  }

  console.log(
    "[Simulate] Simulation complete. Click the focus icon to generate task list.",
  );
}
