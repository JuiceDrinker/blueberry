import React, { useEffect, useState } from 'react'
import { ChatProvider } from './contexts/ChatContext'
import { Chat } from './components/Chat'
import { FocusPanel } from './components/FocusPanel'
import { useDarkMode } from '@common/hooks/useDarkMode'

interface TaskList {
    tasks: Array<{
        id: string
        title: string
        status: 'in_progress' | 'abandoned' | 'completed'
        tabIds: string[]
        reasoning: string
    }>
    driftDetected: boolean
    nudge: string | null
}

const SidebarContent: React.FC = () => {
    const { isDarkMode } = useDarkMode()
    const [taskList, setTaskList] = useState<TaskList | null>(null)
    const [view, setView] = useState<'chat' | 'focus'>('chat')

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }, [isDarkMode])

    useEffect(() => {
        window.sidebarAPI.onTaskListUpdated((data: TaskList) => {
            setTaskList(data)
            setView('focus')
        })

        return () => {
            window.sidebarAPI.removeTaskListUpdatedListener()
        }
    }, [])

    return (
        <div className="h-screen flex flex-col bg-background border-l border-border">
            {view === 'focus' && taskList ? (
                <FocusPanel
                    taskList={taskList}
                    onBackToChat={() => setView('chat')}
                />
            ) : (
                <Chat />
            )}
        </div>
    )
}

export const SidebarApp: React.FC = () => {
    return (
        <ChatProvider>
            <SidebarContent />
        </ChatProvider>
    )
}

