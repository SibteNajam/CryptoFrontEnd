import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ChatState, User, Chat, Message } from '@/types/chat';
import { getUsers, initializeChat, getChatMessages } from '@/lib/chat';

const initialState: ChatState = {
    users: [],
    chats: [],
    activeChat: null,
    messages: [],
    isLoading: false,
    error: null,
};

// Async thunks
export const fetchUsers = createAsyncThunk(
    'chat/fetchUsers',
    async (_, { rejectWithValue }) => {
        try {
            const users = await getUsers();
            console.log(' in slice: Received users:', users);
            return users;
        } catch (error) {
            console.error(' error in slice : Users fetch error:', error);
            return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch users');
        }
    }
);

export const startChat = createAsyncThunk(
    'chat/startChat',
    async (
        { currentUserId, toUserId }: { currentUserId: string; toUserId: string },
        thunkAPI
    ) => {
        try {
            console.log('🔄 Slice: Starting chat with user:', toUserId);

            if (!currentUserId) {
                throw new Error('Current user not found');
            }

            const chat = await initializeChat(currentUserId, toUserId);
            return chat;
        } catch (error) {
            return thunkAPI.rejectWithValue(error instanceof Error ? error.message : 'Failed to start chat');
        }
    }
);

export const fetchChatMessages = createAsyncThunk(
    'chat/fetchChatMessages',
    async (chatId: string, { rejectWithValue }) => {
        try {
            return await getChatMessages(chatId);
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch messages');
        }
    }
);

// export const fetchUserChats = createAsyncThunk(
//     'chat/fetchUserChats',
//     async (_, { rejectWithValue }) => {
//         try {
//             return await getUserChats();
//         } catch (error) {
//             return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch chats');
//         }
//     }
// );

const chatSlice = createSlice({
    name: 'chat',
    initialState,
    reducers: {
        setActiveChat: (state, action: PayloadAction<Chat>) => {
            state.activeChat = action.payload;
            state.messages = action.payload.messages || [];
        },
        addMessage: (state, action: PayloadAction<Message>) => {
            if (state.activeChat && action.payload.chatId === state.activeChat.id) {
                state.messages.push(action.payload);
            }
        },
        clearError: (state) => {
            state.error = null;
        },
        clearActiveChat: (state) => {
            state.activeChat = null;
            state.messages = [];
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch users
            .addCase(fetchUsers.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchUsers.fulfilled, (state, action: PayloadAction<User[]>) => {
                state.isLoading = false;
                state.users = action.payload;
            })
            .addCase(fetchUsers.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // Start chat
            .addCase(startChat.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(startChat.fulfilled, (state, action: PayloadAction<Chat>) => {
                state.isLoading = false;
                state.activeChat = action.payload;
                state.messages = action.payload.messages || [];
            })
            .addCase(startChat.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // Fetch chat messages
            .addCase(fetchChatMessages.fulfilled, (state, action: PayloadAction<Message[]>) => {
                state.messages = action.payload;
            })
        // Fetch user chats
        // .addCase(fetchUserChats.fulfilled, (state, action: PayloadAction<Chat[]>) => {
        //     state.chats = action.payload;
        // });
    },
});

export const { setActiveChat, addMessage, clearError, clearActiveChat } = chatSlice.actions;
export default chatSlice.reducer;

