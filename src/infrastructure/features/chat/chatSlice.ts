import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '@/infrastructure/store';
import { Message, User } from '@/types/chat';

interface ChatState {
  messages: Message[];
  currentUser: User | null;
  selectedUser: User | null;
  typingUsers: Record<string, boolean>;
  onlineUsers: string[];
}

const initialState: ChatState = {
  messages: [],
  currentUser: null,
  selectedUser: null,
  typingUsers: {},
  onlineUsers: [],
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setCurrentUser: (state, action: PayloadAction<User>) => {
      state.currentUser = action.payload;
    },
    setSelectedUser: (state, action: PayloadAction<User | null>) => {
      state.selectedUser = action.payload;
    },
    sendMessage: (state, action: PayloadAction<Message>) => {
      state.messages.push(action.payload);
    },
    receiveMessage: (state, action: PayloadAction<Message>) => {
      state.messages.push(action.payload);
    },
    setTypingStatus: (
      state,
      action: PayloadAction<{ userId: string; isTyping: boolean }>
    ) => {
      state.typingUsers[action.payload.userId] = action.payload.isTyping;
    },
    markMessageAsRead: (state, action: PayloadAction<string>) => {
      const message = state.messages.find((m) => m.id === action.payload);
      if (message) {
        message.read = true;
      }
    },
    setOnlineUsers: (state, action: PayloadAction<string[]>) => {
      state.onlineUsers = action.payload;
    },
  },
});

export const {
  setCurrentUser,
  setSelectedUser,
  sendMessage,
  receiveMessage,
  setTypingStatus,
  markMessageAsRead,
  setOnlineUsers,
} = chatSlice.actions;

export const selectMessages = (state: RootState) => state.chat.messages;
export const selectCurrentUser = (state: RootState) => state.chat.currentUser;
export const selectSelectedUser = (state: RootState) => state.chat.selectedUser;
export const selectTypingUsers = (state: RootState) => state.chat.typingUsers;
export const selectOnlineUsers = (state: RootState) => state.chat.onlineUsers;

export default chatSlice.reducer;
