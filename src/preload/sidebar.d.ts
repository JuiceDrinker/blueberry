import { ElectronAPI } from "@electron-toolkit/preload";

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

interface TabInfo {
  id: string;
  title: string;
  url: string;
  isActive: boolean;
}

interface SidebarAPI {
  // Chat functionality
  sendChatMessage: (request: ChatRequest) => Promise<void>;
  onChatResponse: (callback: (data: ChatResponse) => void) => void;
  removeChatResponseListener: () => void;

  // Focus agent
  onFocusAgentLoading: (callback: () => void) => void;
  onTaskListUpdated: (callback: (data: any) => void) => void;
  removeFocusAgentListeners: () => void;

  // Tab actions from focus panel
  switchTab: (tabId: string) => Promise<boolean>;
  closeTab: (tabId: string) => Promise<void>;

  // Distraction blocking
  focusOnTask: (taskTitle: string) => Promise<{ isBlocking: boolean; focusedTaskTitle: string | null }>;
  unfocusTask: () => Promise<{ isBlocking: boolean; focusedTaskTitle: string | null }>;
  getBlockerState: () => Promise<{ isBlocking: boolean; focusedTaskTitle: string | null }>;

  // Page content access
  getPageContent: () => Promise<string | null>;
  getPageText: () => Promise<string | null>;
  getCurrentUrl: () => Promise<string | null>;

  // Tab information
  getActiveTabInfo: () => Promise<TabInfo | null>;
}

declare global {
  interface Window {
    electron: ElectronAPI;
    sidebarAPI: SidebarAPI;
  }
}

