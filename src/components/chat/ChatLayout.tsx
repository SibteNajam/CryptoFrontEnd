/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// frontend/src/components/chat/ChatLayout.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/auth';
import { User } from '@/types/chat';
import UserList from './UserList';
import ChatWindow from './ChatWindow';
import { useChat } from '@/hooks/useChat';
import ChatApp from './chatApp';

export default function ChatLayout() {
    const { user, logout } = useAuth();
    const { initializeChat, activeChat, closeChat } = useChat();
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [chatLoading, setChatLoading] = useState(false);
    const [currentUserId, setCurrentUserId] = useState('755d5f20-ff08-47f7-8d63-99a251463e5c');
    const handleUserSelect = async (selectedUser: User) => {

        setSelectedUser(selectedUser);
        setChatLoading(true);

        try {
            await initializeChat(currentUserId, selectedUser.id);
        } catch (error) {
            console.error('Failed to start chat:', error);
            setSelectedUser(null);
        }
        finally {
            setChatLoading(false);
        }
    };

    const handleCloseChat = () => {
        setSelectedUser(null);
        closeChat();
    };

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };


    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div className="flex items-center">
                            <h1 className="text-2xl font-bold text-gray-900">ChatCraftAI</h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                                <div className="h-8 w-8 bg-indigo-500 rounded-full flex items-center justify-center">
                                    <span className="text-white font-medium text-sm">
                                        {user?.displayName.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                                <span className="text-sm font-medium text-gray-700">
                                    {user?.displayName}
                                </span>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <div className="grid āgrid-cols-1 lg:grid-cols-2 gap-6">
                        {/* User List */}
                        <div>
                            <UserList onUserSelect={handleUserSelect} />
                        </div>

                        {/* Chat Window */}
                        <div>
                            {/* test file to send message using sockets */}
                            <ChatApp />

                            {chatLoading ? (
                                <div className="bg-white shadow rounded-lg flex items-center justify-center h-96">
                                    <div className="text-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                                        <p className="text-gray-500">Opening chat with {selectedUser?.displayName}...</p>
                                    </div>
                                </div>
                            ) : selectedUser ? ( // ← Remove activeChat requirement
                                <ChatWindow
                                    chat={activeChat || { id: 'test', participants: [] } as any} // ← Provide dummy chat
                                    selectedUser={selectedUser}
                                    onClose={handleCloseChat}
                                />
                            ) : (
                                <div className="bg-white shadow rounded-lg flex items-center justify-center h-96">
                                    <div className="text-center">
                                        <svg
                                            className="mx-auto h-12 w-12 text-gray-400"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                            />
                                        </svg>
                                        <h3 className="mt-2 text-sm font-medium text-gray-900">No chat selected</h3>
                                        <p className="mt-1 text-sm text-gray-500">
                                            Select a user from the list to start chatting
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
