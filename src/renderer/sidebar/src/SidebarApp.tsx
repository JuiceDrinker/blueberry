import React, { useEffect, useState } from "react";
import { ChatProvider, useChat } from "./contexts/ChatContext";
import { Chat } from "./components/Chat";
import { FocusPanel } from "./components/FocusPanel";
import { useDarkMode } from "@common/hooks/useDarkMode";

interface TaskList {
  tasks: Array<{
    id: string;
    title: string;
    status: "in_progress" | "abandoned" | "completed";
    tabIds: string[];
    nextStep: string | null;
  }>;
  distractions: Array<{
    tabId: string;
    domain: string;
  }>;
  driftDetected: boolean;
  nudge: string | null;
}

const SidebarContent: React.FC = () => {
  const { isDarkMode } = useDarkMode();
  const { sendMessage } = useChat();
  const [taskList, setTaskList] = useState<TaskList | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<"chat" | "focus">("chat");

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  const [isUpdating, setIsUpdating] = useState(false);
  const taskListRef = React.useRef(taskList);
  taskListRef.current = taskList;

  useEffect(() => {
    window.sidebarAPI.onShowFocusPanel(() => {
      setView("focus");
    });

    window.sidebarAPI.onFocusAgentLoading(() => {
      if (taskListRef.current) {
        setIsUpdating(true);
      } else {
        setIsLoading(true);
      }
      setView("focus");
    });

    window.sidebarAPI.onTaskListUpdated((data: TaskList) => {
      setTaskList(data);
      setIsLoading(false);
      setIsUpdating(false);
    });

    return () => {
      window.sidebarAPI.removeFocusAgentListeners();
    };
  }, []);

  const handleActOnNextStep = (tabId: string, nextStep: string): void => {
    window.sidebarAPI.switchTab(tabId);
    setView("chat");
    sendMessage(`Help me with this: ${nextStep}`);
  };

  return (
    <div className="h-screen flex flex-col bg-background border-l border-border">
      {view === "focus" ? (
        <FocusPanel
          taskList={taskList}
          isLoading={isLoading}
          isUpdating={isUpdating}
          onBackToChat={() => setView("chat")}
          onActOnNextStep={handleActOnNextStep}
        />
      ) : (
        <Chat />
      )}
    </div>
  );
};

export const SidebarApp: React.FC = () => {
  return (
    <ChatProvider>
      <SidebarContent />
    </ChatProvider>
  );
};
