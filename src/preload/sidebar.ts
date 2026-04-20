import { contextBridge } from "electron";
import { electronAPI } from "@electron-toolkit/preload";

interface ChatRequest {
  message: string;
  context: {
    url: string | null;
    content: string | null;
    text: string | null;
  };
  messageId: string;
}

interface ChatResponse {
  messageId: string;
  content: string;
  isComplete: boolean;
}

// Sidebar specific APIs
const sidebarAPI = {
  // Chat functionality
  sendChatMessage: (request: Partial<ChatRequest>) =>
    electronAPI.ipcRenderer.invoke("sidebar-chat-message", request),

  clearChat: () => electronAPI.ipcRenderer.invoke("sidebar-clear-chat"),

  getMessages: () => electronAPI.ipcRenderer.invoke("sidebar-get-messages"),

  onChatResponse: (callback: (data: ChatResponse) => void) => {
    electronAPI.ipcRenderer.on("chat-response", (_, data) => callback(data));
  },

  onMessagesUpdated: (callback: (messages: any[]) => void) => {
    electronAPI.ipcRenderer.on("chat-messages-updated", (_, messages) =>
      callback(messages),
    );
  },

  removeChatResponseListener: () => {
    electronAPI.ipcRenderer.removeAllListeners("chat-response");
  },

  removeMessagesUpdatedListener: () => {
    electronAPI.ipcRenderer.removeAllListeners("chat-messages-updated");
  },

  // Focus agent
  onFocusAgentLoading: (callback: () => void) => {
    electronAPI.ipcRenderer.on("focus-agent-loading", () => callback());
  },

  onShowFocusPanel: (callback: () => void) => {
    electronAPI.ipcRenderer.on("show-focus-panel", () => callback());
  },

  onTaskListUpdated: (callback: (data: Record<string, unknown>) => void) => {
    electronAPI.ipcRenderer.on("task-list-updated", (_, data) =>
      callback(data),
    );
  },

  removeFocusAgentListeners: () => {
    electronAPI.ipcRenderer.removeAllListeners("focus-agent-loading");
    electronAPI.ipcRenderer.removeAllListeners("task-list-updated");
    electronAPI.ipcRenderer.removeAllListeners("show-focus-panel");
  },

  // Tab actions from focus panel
  switchTab: (tabId: string) =>
    electronAPI.ipcRenderer.invoke("switch-tab", tabId),
  closeTab: (tabId: string) =>
    electronAPI.ipcRenderer.invoke("close-tab", tabId),

  // Distraction blocking
  focusOnTask: (taskTitle: string) =>
    electronAPI.ipcRenderer.invoke("focus-on-task", taskTitle),

  unfocusTask: () => electronAPI.ipcRenderer.invoke("unfocus-task"),

  getBlockerState: () => electronAPI.ipcRenderer.invoke("get-blocker-state"),

  // Page content access
  getPageContent: () => electronAPI.ipcRenderer.invoke("get-page-content"),
  getPageText: () => electronAPI.ipcRenderer.invoke("get-page-text"),
  getCurrentUrl: () => electronAPI.ipcRenderer.invoke("get-current-url"),

  // Tab information
  getActiveTabInfo: () => electronAPI.ipcRenderer.invoke("get-active-tab-info"),
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI);
    contextBridge.exposeInMainWorld("sidebarAPI", sidebarAPI);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI;
  // @ts-ignore (define in dts)
  window.sidebarAPI = sidebarAPI;
}
