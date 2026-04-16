import React, { useState, useEffect } from 'react'
import { CheckCircle2, Circle, XCircle, MessageSquare, Target, Shield, ShieldOff, Loader2 } from 'lucide-react'
import { cn } from '@common/lib/utils'

interface Task {
    id: string
    title: string
    status: 'in_progress' | 'abandoned' | 'completed'
    tabIds: string[]
    reasoning: string
}

interface TaskList {
    tasks: Task[]
    driftDetected: boolean
    nudge: string | null
}

interface FocusPanelProps {
    taskList: TaskList | null
    isLoading: boolean
    onBackToChat: () => void
}

const statusConfig = {
    in_progress: {
        icon: Circle,
        label: 'In progress',
        className: 'text-blue-500',
        bg: 'bg-blue-500/10',
    },
    abandoned: {
        icon: XCircle,
        label: 'Distraction',
        className: 'text-amber-500',
        bg: 'bg-amber-500/10',
    },
    completed: {
        icon: CheckCircle2,
        label: 'Completed',
        className: 'text-emerald-500',
        bg: 'bg-emerald-500/10',
    },
}

const TaskItem: React.FC<{
    task: Task
    focusedTaskTitle: string | null
    onFocus: (title: string) => void
    onUnfocus: () => void
}> = ({ task, focusedTaskTitle, onFocus, onUnfocus }) => {
    const config = statusConfig[task.status]
    const Icon = config.icon
    const isFocused = focusedTaskTitle === task.title

    return (
        <div className={cn(
            "p-4 rounded-xl border",
            "bg-background dark:bg-secondary/30",
            "transition-all duration-200",
            isFocused
                ? "border-blue-500/50 ring-1 ring-blue-500/20"
                : "border-border",
        )}>
            <div className="flex items-start gap-3">
                <div className={cn("mt-0.5", config.className)}>
                    <Icon className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-foreground">
                        {task.title}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                        {task.reasoning}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                        <span className={cn(
                            "text-xs px-2 py-0.5 rounded-full",
                            config.bg,
                            config.className,
                        )}>
                            {config.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            {task.tabIds.length} {task.tabIds.length === 1 ? 'tab' : 'tabs'}
                        </span>
                    </div>

                    {task.status === 'in_progress' && (
                        <div className="mt-3">
                            {isFocused ? (
                                <button
                                    onClick={onUnfocus}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium",
                                        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                                        "hover:bg-emerald-500/20 transition-colors duration-200",
                                    )}
                                >
                                    <ShieldOff className="size-3.5" />
                                    Mark done & unblock
                                </button>
                            ) : (
                                <button
                                    onClick={() => onFocus(task.title)}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium",
                                        "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                                        "hover:bg-blue-500/20 transition-colors duration-200",
                                    )}
                                >
                                    <Shield className="size-3.5" />
                                    Focus on this
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export const FocusPanel: React.FC<FocusPanelProps> = ({ taskList, isLoading, onBackToChat }) => {
    const [focusedTaskTitle, setFocusedTaskTitle] = useState<string | null>(null)

    useEffect(() => {
        window.sidebarAPI.getBlockerState().then((state) => {
            setFocusedTaskTitle(state.focusedTaskTitle)
        })
    }, [])

    const handleFocus = async (taskTitle: string) => {
        const state = await window.sidebarAPI.focusOnTask(taskTitle)
        setFocusedTaskTitle(state.focusedTaskTitle)
    }

    const handleUnfocus = async () => {
        const state = await window.sidebarAPI.unfocusTask()
        setFocusedTaskTitle(state.focusedTaskTitle)
    }

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                    <Target className="size-4 text-foreground" />
                    <span className="text-sm font-semibold text-foreground">Focus Flow</span>
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
                            Distractions blocked
                        </span>
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
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
                            <div className={cn(
                                "p-4 rounded-xl mb-4",
                                "bg-amber-500/10 border border-amber-500/20",
                            )}>
                                <p className="text-sm text-foreground">
                                    {taskList.nudge}
                                </p>
                            </div>
                        )}

                        {/* Task list */}
                        <div className="flex flex-col gap-3">
                            {taskList.tasks.map((task) => (
                                <TaskItem
                                    key={task.id}
                                    task={task}
                                    focusedTaskTitle={focusedTaskTitle}
                                    onFocus={handleFocus}
                                    onUnfocus={handleUnfocus}
                                />
                            ))}
                        </div>

                        {taskList.tasks.length === 0 && (
                            <div className="flex items-center justify-center h-48">
                                <p className="text-sm text-muted-foreground">
                                    Not enough browsing activity yet.
                                </p>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex items-center justify-center h-48">
                        <p className="text-sm text-muted-foreground">
                            Click the focus icon to analyze your session.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
