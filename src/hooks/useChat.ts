import { useAppDispatch, useAppSelector } from '@/infrastructure/store/hooks';
import {
  sendMessage,
  receiveMessage,
  setTypingStatus,
  markMessageAsRead,
} from '@/infrastructure/features/chat/chatSlice';
import { useEffect } from 'react';
import { chatService } from '@/lib/chat';

export function useChat() {
  const dispatch = useAppDispatch();
  const { messages, currentUser, selectedUser, typingUsers } = useAppSelector(
    (state) => state.chat
  );

  useEffect(() => {
    // Set up socket listeners
    chatService.onMessageReceived((message) => {
      dispatch(receiveMessage(message));
    });

    chatService.onTyping((data) => {
      dispatch(setTypingStatus({ userId: data.userId, isTyping: true }));
    });

    chatService.onStopTyping((data) => {
      dispatch(setTypingStatus({ userId: data.userId, isTyping: false }));
    });

    return () => {
      chatService.disconnect();
    };
  }, [dispatch]);

  const handleSendMessage = (content: string, recipientId: string) => {
    const message = {
      id: Date.now().toString(),
      content,
      senderId: currentUser?.id || '',
      recipientId,
      timestamp: Date.now(),
      read: false,
    };

    dispatch(sendMessage(message));
    chatService.sendMessage(message);
  };

  const handleTyping = (recipientId: string) => {
    chatService.typing(currentUser?.id || '', recipientId);
  };

  const handleStopTyping = (recipientId: string) => {
    chatService.stopTyping(currentUser?.id || '', recipientId);
  };

  const handleMarkAsRead = (messageId: string) => {
    dispatch(markMessageAsRead(messageId));
    chatService.markAsRead(messageId);
  };

  return {
    messages,
    currentUser,
    selectedUser,
    typingUsers,
    sendMessage: handleSendMessage,
    onTyping: handleTyping,
    onStopTyping: handleStopTyping,
    markAsRead: handleMarkAsRead,
  };
}
