import React from 'react'
import { CheckCircle2, Circle, XCircle, MessageSquare, Target } from 'lucide-react'
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
    taskList: TaskList
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
        label: 'Abandoned',
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

const TaskItem: React.FC<{ task: Task }> = ({ task }) => {
    const config = statusConfig[task.status]
    const Icon = config.icon

    return (
        <div className={cn(
            "p-4 rounded-xl border border-border",
            "bg-background dark:bg-secondary/30",
            "transition-all duration-200",
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
                </div>
            </div>
        </div>
    )
}

export const FocusPanel: React.FC<FocusPanelProps> = ({ taskList, onBackToChat }) => {
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

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
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
                        <TaskItem key={task.id} task={task} />
                    ))}
                </div>

                {taskList.tasks.length === 0 && (
                    <div className="flex items-center justify-center h-48">
                        <p className="text-sm text-muted-foreground">
                            Not enough browsing activity yet.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
