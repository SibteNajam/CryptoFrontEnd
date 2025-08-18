'use client';

import { useEffect, useState } from 'react';
import { useChat } from '@/hooks/useChat';
import { User } from '@/types/chat';
import { useAuth } from '@/hooks/auth';
// const dummyUsers: User[] = [
//     {
//         id: '1',
//         email: 'john.doe@example.com',
//         displayName: 'John Doe',
//         createdAt: '2024-01-15T10:30:00Z',
//     },
//     {
//         id: '2',
//         email: 'jane.smith@example.com',
//         displayName: 'Jane Smith',
//         createdAt: '2024-01-16T09:15:00Z',
//     },
//     {
//         id: '3',
//         email: 'mike.johnson@example.com',
//         displayName: 'Mike Johnson',
//         createdAt: '2024-01-17T14:45:00Z',
//     },
//     {
//         id: '4',
//         email: 'sarah.wilson@example.com',
//         displayName: 'Sarah Wilson',
//         createdAt: '2024-01-18T11:20:00Z',
//     },
//     {
//         id: '5',
//         email: 'alex.brown@example.com',
//         displayName: 'Alex Brown',
//         createdAt: '2024-01-19T16:30:00Z',
//     },
// ];

interface UserListProps {
    onUserSelect: (user: User) => void;
}
export default function UserList({ onUserSelect }: UserListProps) {
    const { users, isLoading, error, loadUsers } = useChat();
    const { user: currentUser } = useAuth(); // Get current user
    const [isMounted, setIsMounted] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false); // ← Add this state
    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        // Only load users once when component mounts
        if (isMounted && !hasLoaded) {
            console.log('🔄 UserList: Loading users...');
            loadUsers();
            setHasLoaded(true); // ← Prevent future loads
        }
    }, [isMounted, hasLoaded]); // ← Remove loadUsers from dependencies

    // Show loading state
    if (!isMounted || isLoading) {
        return (
            <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                        Available Users
                    </h3>
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                        Available Users
                    </h3>
                    <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-red-800">Error loading users: {error}</p>
                        <button
                            onClick={() => {
                                setHasLoaded(false); // ← Reset to allow retry
                                loadUsers();
                            }}
                            className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }
    const otherUsers = users.filter(user => user.id !== currentUser?.id);

    return (
        <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Users ({otherUsers.length})
                </h3>
                <div className="space-y-3">
                    {otherUsers.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No other users found</p>
                    ) : (
                        otherUsers.map((user) => (
                            <div
                                key={user.id}
                                onClick={() => onUserSelect(user)}
                                className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
                            >
                                <div className="flex-shrink-0">
                                    <div className="h-10 w-10 bg-indigo-500 rounded-full flex items-center justify-center">
                                        <span className="text-white font-medium text-sm">
                                            {user.displayName.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                                <div className="ml-3 flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                        {user.displayName}
                                    </p>
                                    <p className="text-sm text-gray-500 truncate">
                                        {user.email}
                                    </p>
                                </div>
                                <div className="flex-shrink-0">
                                    <svg
                                        className="h-5 w-5 text-gray-400"
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
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}