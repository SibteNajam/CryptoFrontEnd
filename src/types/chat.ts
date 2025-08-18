// frontend/src/types/chat.ts
export interface User {
    id: string;
    email: string;
    displayName: string;
    createdAt: string;
}

export interface Message {
    id: string;
    content: string;
    senderId: string;
    receiverId: string;
    chatId: string;
    createdAt: string;
    sender: {
        id: string;
        displayName: string;
    };
}

export interface Chat {
    id: string;
    participants: {
        user: User;
    }[];
    messages: Message[];
    createdAt: string;
}

export interface ChatState {
    users: User[];
    chats: Chat[];
    activeChat: Chat | null;
    messages: Message[];
    isLoading: boolean;
    error: string | null;
}
