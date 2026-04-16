import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  Circle,
  XCircle,
  MessageSquare,
  Target,
  Shield,
  Loader2,
  ExternalLink,
  X,
} from "lucide-react";
import { cn } from "@common/lib/utils";

interface Task {
  id: string;
  title: string;
  status: "in_progress" | "abandoned" | "completed";
  tabIds: string[];
  nextStep: string | null;
}

interface Distraction {
  tabId: string;
  domain: string;
}

interface TaskList {
  tasks: Task[];
  distractions: Distraction[];
  driftDetected: boolean;
  nudge: string | null;
}

interface FocusPanelProps {
  taskList: TaskList | null;
  isLoading: boolean;
  isUpdating: boolean;
  onBackToChat: () => void;
  onActOnNextStep: (tabId: string, nextStep: string) => void;
}

const statusConfig = {
  in_progress: {
    icon: Circle,
    label: "In progress",
    className: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  abandoned: {
    icon: XCircle,
    label: "Stalled",
    className: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  completed: {
    icon: CheckCircle2,
    label: "Done",
    className: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
};

const TaskItem: React.FC<{
  task: Task;
  focusedTaskTitle: string | null;
  onFocus: (title: string) => void;
  onUnfocus: () => void;
  onSwitchToTab: (tabId: string) => void;
  onComplete: (taskId: string) => void;
  onActOnNextStep: (tabId: string, nextStep: string) => void;
  onDismiss: (taskId: string) => void;
}> = ({
  task,
  focusedTaskTitle,
  onFocus,
  onUnfocus,
  onSwitchToTab,
  onComplete,
  onActOnNextStep,
  onDismiss,
}) => {
  const config = statusConfig[task.status];
  const Icon = config.icon;
  const isFocused = focusedTaskTitle === task.title;

  return (
    <div
      className={cn(
        "p-4 rounded-xl border group",
        "bg-background dark:bg-secondary/30",
        "transition-all duration-200",
        isFocused
          ? "border-blue-500/50 ring-1 ring-blue-500/20"
          : "border-border",
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("mt-0.5", config.className)}>
          <Icon className="size-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="font-medium text-sm text-foreground">
              {task.title}
            </div>
            <button
              onClick={() => onDismiss(task.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground shrink-0"
            >
              <X className="size-3.5" />
            </button>
          </div>

          {task.nextStep && (
            <button
              onClick={() =>
                task.tabIds[0] &&
                onActOnNextStep(task.tabIds[0], task.nextStep!)
              }
              className={cn(
                "w-full text-left text-xs mt-1.5 p-2 rounded-lg",
                "bg-muted/50 dark:bg-muted/30",
                "text-muted-foreground hover:text-foreground",
                "hover:bg-muted transition-colors duration-200",
                "cursor-pointer italic",
              )}
            >
              Next: {task.nextStep} →
            </button>
          )}

          <div className="flex items-center gap-2 mt-2">
            <span
              className={cn(
                "text-xs px-2 py-0.5 rounded-full",
                config.bg,
                config.className,
              )}
            >
              {config.label}
            </span>
            <button
              onClick={() => task.tabIds[0] && onSwitchToTab(task.tabIds[0])}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <ExternalLink className="size-3" />
              {task.tabIds.length} {task.tabIds.length === 1 ? "tab" : "tabs"}
            </button>
          </div>

          {task.status === "in_progress" && (
            <div className="flex items-center gap-2 mt-3">
              {isFocused ? (
                <button
                  onClick={() => {
                    onComplete(task.id);
                    onUnfocus();
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium",
                    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                    "hover:bg-emerald-500/20 transition-colors duration-200",
                  )}
                >
                  <CheckCircle2 className="size-3.5" />
                  Done & unblock
                </button>
              ) : (
                <>
                  <button
                    onClick={() => onFocus(task.title)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium",
                      "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                      "hover:bg-blue-500/20 transition-colors duration-200",
                    )}
                  >
                    <Shield className="size-3.5" />
                    Focus
                  </button>
                  <button
                    onClick={() => onComplete(task.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium",
                      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                      "hover:bg-emerald-500/20 transition-colors duration-200",
                    )}
                  >
                    <CheckCircle2 className="size-3.5" />
                    Done
                  </button>
                </>
              )}
            </div>
          )}

          {task.status === "abandoned" && (
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => onComplete(task.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium",
                  "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                  "hover:bg-emerald-500/20 transition-colors duration-200",
                )}
              >
                <CheckCircle2 className="size-3.5" />
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const DistractionBar: React.FC<{
  distractions: Distraction[];
  onCloseAll: () => void;
}> = ({ distractions, onCloseAll }) => {
  if (distractions.length === 0) return null;

  const domains = [...new Set(distractions.map((d) => d.domain))];

  return (
    <div
      className={cn(
        "mx-4 mb-3 p-3 rounded-xl",
        "bg-amber-500/5 border border-amber-500/15",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
            {distractions.length} distraction{" "}
            {distractions.length === 1 ? "tab" : "tabs"}
          </span>
          <span className="text-xs text-muted-foreground ml-1.5">
            {domains.join(", ")}
          </span>
        </div>
        <button
          onClick={onCloseAll}
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-md text-xs",
            "text-amber-600 dark:text-amber-400",
            "hover:bg-amber-500/10 transition-colors duration-200",
          )}
        >
          <X className="size-3" />
          Close
        </button>
      </div>
    </div>
  );
};

export const FocusPanel: React.FC<FocusPanelProps> = ({
  taskList,
  isLoading,
  isUpdating,
  onBackToChat,
  onActOnNextStep,
}) => {
  const [focusedTaskTitle, setFocusedTaskTitle] = useState<string | null>(null);
  const [localTasks, setLocalTasks] = useState<Task[]>([]);
  const [localDistractions, setLocalDistractions] = useState<Distraction[]>([]);

  useEffect(() => {
    if (taskList) {
      setLocalTasks(taskList.tasks);
      setLocalDistractions(taskList.distractions ?? []);
    }
  }, [taskList]);

  useEffect(() => {
    window.sidebarAPI.getBlockerState().then((state) => {
      setFocusedTaskTitle(state.focusedTaskTitle);
    });
  }, []);

  const handleFocus = async (taskTitle: string): Promise<void> => {
    const state = await window.sidebarAPI.focusOnTask(taskTitle);
    setFocusedTaskTitle(state.focusedTaskTitle);
  };

  const handleUnfocus = async (): Promise<void> => {
    const state = await window.sidebarAPI.unfocusTask();
    setFocusedTaskTitle(state.focusedTaskTitle);
  };

  const handleSwitchToTab = (tabId: string): void => {
    window.sidebarAPI.switchTab(tabId);
  };

  const handleCompleteTask = (taskId: string): void => {
    setLocalTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, status: "completed" as const, nextStep: null }
          : t,
      ),
    );
    if (focusedTaskTitle) {
      const task = localTasks.find((t) => t.id === taskId);
      if (task && task.title === focusedTaskTitle) {
        handleUnfocus();
      }
    }
  };

  const handleDismissTask = (taskId: string): void => {
    const task = localTasks.find((t) => t.id === taskId);
    if (task && task.title === focusedTaskTitle) {
      handleUnfocus();
    }
    setLocalTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const handleCloseDistractions = (): void => {
    for (const distraction of localDistractions) {
      window.sidebarAPI.closeTab(distraction.tabId);
    }
    setLocalDistractions([]);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          {isUpdating ? (
            <Loader2 className="size-4 text-muted-foreground animate-spin" />
          ) : (
            <Target className="size-4 text-foreground" />
          )}
          <span className="text-sm font-semibold text-foreground">
            Focus Flow
          </span>
        </div>
        <button
          onClick={onBackToChat}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs",
            "text-muted-foreground hover:text-foreground",
            "hover:bg-muted transition-colors duration-200",
          )}
        >
          <MessageSquare className="size-3.5" />
          Chat
        </button>
      </div>

      {/* Blocking banner */}
      {focusedTaskTitle && (
        <div className="px-4 py-2 bg-blue-500/10 border-b border-blue-500/20">
          <div className="flex items-center gap-2">
            <Shield className="size-3.5 text-blue-500" />
            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
              Distractions blocked — focusing on task
            </span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto py-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <Loader2 className="size-6 text-muted-foreground animate-spin" />
            <p className="text-sm text-muted-foreground">
              Analyzing your browsing session...
            </p>
          </div>
        ) : taskList ? (
          <>
            {/* Nudge */}
            {taskList.driftDetected && taskList.nudge && (
              <div
                className={cn(
                  "p-4 rounded-xl mb-4 mx-4",
                  "bg-amber-500/10 border border-amber-500/20",
                )}
              >
                <p className="text-sm text-foreground">{taskList.nudge}</p>
              </div>
            )}

            {/* Task list */}
            <div className="flex flex-col gap-3 px-4">
              {localTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  focusedTaskTitle={focusedTaskTitle}
                  onFocus={handleFocus}
                  onUnfocus={handleUnfocus}
                  onSwitchToTab={handleSwitchToTab}
                  onComplete={handleCompleteTask}
                  onActOnNextStep={onActOnNextStep}
                  onDismiss={handleDismissTask}
                />
              ))}
            </div>

            {localTasks.length === 0 && (
              <div className="flex items-center justify-center h-48 px-4">
                <p className="text-sm text-muted-foreground">
                  Not enough browsing activity yet.
                </p>
              </div>
            )}

            {/* Distractions bar */}
            <div className="mt-4">
              <DistractionBar
                distractions={localDistractions}
                onCloseAll={handleCloseDistractions}
              />
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-48 px-4">
            <p className="text-sm text-muted-foreground">
              Click the focus icon to analyze your session.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
