/* eslint-disable @typescript-eslint/no-explicit-any */
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { fetchUsers, startChat, fetchChatMessages, setActiveChat, addMessage, clearError, clearActiveChat } from '@/store/chatSlice';
import { Chat, Message } from '@/types/chat';

export const useChat = () => {
    const dispatch = useDispatch<AppDispatch>();

    const chatState = useSelector((state: RootState) => state.chat || {});
    const {
        chats = [],
        messages = [],
        isLoading = false,
        error = null
    } = chatState;
    const users = chatState.users || [];
    const activeChat = chatState.activeChat || null;

    // currently not propelry setup

    const loadUsers = async () => {
        try {
            const result = await dispatch(fetchUsers());
            console.log(' in Hook console: Users result:', result);
            return result;
        } catch (error) {
            console.error(' Hook: Users error:', error);
            throw error;
        }
    };

    const initializeChat = async (fromUserId: string, receiverId: string) => {
        return dispatch(startChat({ currentUserId: fromUserId, toUserId: receiverId }));
    };

    const loadChatMessages = async (chatId: string) => {
        return dispatch(fetchChatMessages(chatId));
    };

    // const loadUserChats = async () => {
    //     return dispatch(fetchUserChats());
    // };

    const selectChat = (chat: Chat) => {
        dispatch(setActiveChat(chat));
    };

    const addNewMessage = (message: Message) => {
        dispatch(addMessage(message));
    };

    const clearChatError = () => {
        dispatch(clearError());
    };

    const closeChat = () => {
        dispatch(clearActiveChat());
    };

    return {
        users,
        chats,
        activeChat,
        messages,
        isLoading,
        error,
        loadUsers,
        initializeChat,
        loadChatMessages,
        // loadUserChats,
        selectChat,
        addNewMessage,
        clearChatError,
        closeChat,
    };
};