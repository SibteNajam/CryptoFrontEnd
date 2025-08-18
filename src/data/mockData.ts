import { User, Chat, Message } from '@/types/chat';

export const dummyUsers: User[] = [
    {
        id: '1',
        email: 'john.doe@example.com',
        displayName: 'John Doe',
        createdAt: '2024-01-15T10:30:00Z',
    },
    {
        id: '2',
        email: 'jane.smith@example.com',
        displayName: 'Jane Smith',
        createdAt: '2024-01-16T09:15:00Z',
    },
    {
        id: '3',
        email: 'mike.johnson@example.com',
        displayName: 'Mike Johnson',
        createdAt: '2024-01-17T14:45:00Z',
    },
    {
        id: '4',
        email: 'sarah.wilson@example.com',
        displayName: 'Sarah Wilson',
        createdAt: '2024-01-18T11:20:00Z',
    },
    {
        id: '5',
        email: 'alex.brown@example.com',
        displayName: 'Alex Brown',
        createdAt: '2024-01-19T16:30:00Z',
    },
];

export const dummyMessages: Message[] = [
    {
        id: 'msg1',
        content: 'Hey! How are you doing?',
        senderId: '1',
        receiverId: 'current-user',
        chatId: 'chat1',
        createdAt: '2024-01-20T10:00:00Z',
        sender: {
            id: '1',
            displayName: 'John Doe',
        },
    },
    {
        id: 'msg2',
        content: 'I\'m doing great! Thanks for asking.',
        senderId: 'current-user',
        receiverId: '1',
        chatId: 'chat1',
        createdAt: '2024-01-20T10:02:00Z',
        sender: {
            id: 'current-user',
            displayName: 'You',
        },
    },
];

export const dummyChats: Chat[] = [
    {
        id: 'chat1',
        participants: [
            {
                user: {
                    id: '1',
                    email: 'john.doe@example.com',
                    displayName: 'John Doe',
                    createdAt: '2024-01-15T10:30:00Z',
                },
            },
            {
                user: {
                    id: 'current-user',
                    email: 'current@example.com',
                    displayName: 'You',
                    createdAt: '2024-01-14T10:30:00Z',
                },
            },
        ],
        messages: dummyMessages.filter(msg => msg.chatId === 'chat1'),
        createdAt: '2024-01-20T10:00:00Z',
    },
    {
        id: 'chat2',
        participants: [
            {
                user: {
                    id: '2',
                    email: 'jane.smith@example.com',
                    displayName: 'Jane Smith',
                    createdAt: '2024-01-16T09:15:00Z',
                },
            },
            {
                user: {
                    id: 'current-user',
                    email: 'current@example.com',
                    displayName: 'You',
                    createdAt: '2024-01-14T10:30:00Z',
                },
            },
        ],
        messages: dummyMessages.filter(msg => msg.chatId === 'chat2'),
        createdAt: '2024-01-20T09:30:00Z',
    },
];

// Helper function to get messages for a specific chat
export const getMessagesForChat = (chatId: string): Message[] => {
    return dummyMessages.filter(msg => msg.chatId === chatId);
};

// Helper function to create a new chat with a user
export const createDummyChat = (user: User): Chat => {
    return {
        id: `chat-${user.id}`,
        participants: [
            { user },
            {
                user: {
                    id: 'current-user',
                    email: 'current@example.com',
                    displayName: 'You',
                    createdAt: '2024-01-14T10:30:00Z',
                },
            },
        ],
        messages: [],
        createdAt: new Date().toISOString(),
    };
};
