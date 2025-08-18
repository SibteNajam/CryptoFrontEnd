/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const socket: Socket = io('http://localhost:3000');

const ChatApp: React.FC = () => {
    const [message, setMessage] = useState('');
    const [chatId, setChatId] = useState('755d5f20-ff08-47f7-8d63-99a251463e5c');
    const [userId, setUserId] = useState('130a2482-d66c-48f9-8538-994a93ed9fa2');
    const [messages, setMessages] = useState<any[]>([]);

    useEffect(() => {
        // Receive messages
        socket.on('receive_message', (data) => {
            console.log('Received:', data);
            setMessages((prev) => [...prev, data]);
        });

        return () => {
            socket.off('receive_message');
        };
    }, []);

    const sendMessage = () => {
        if (!message.trim()) return;

        socket.emit('send_message', {
            chatId,
            userId,
            message,
        });

        setMessage('');
    };

    return (
        <div style={{ padding: '20px' }}>
            <h2>React Chat</h2>
            <div style={{ border: '1px solid #ccc', padding: 10, height: 200, overflowY: 'auto' }}>
                {messages.map((msg, idx) => (
                    <div key={idx}>
                        <strong>{msg.senderId || 'Unknown'}:</strong> {msg.content || msg.message}
                    </div>
                ))}
            </div>

            <input
                type="text"
                value={message}
                placeholder="Type a message..."
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                style={{ width: '70%', marginRight: 10 }}
            />
            <button onClick={sendMessage}>Send</button>
        </div>
    );
};

export default ChatApp;