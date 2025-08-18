'use client';

import { useState, useEffect, useRef } from 'react';
import { Chat, User } from '@/types/chat';
import { useAuth } from '@/hooks/auth';
import { useChat } from '@/hooks/useChat';
import { useGrammarCheck } from '@/hooks/useGrammarCheck';
import { GrammarHighlight } from './GrammarHighlight';
import { GrammarError } from '@/types/grammar';

interface ChatWindowProps {
    chat: Chat;
    selectedUser?: User | null;
    onClose: () => void;
}

export default function ChatWindow({ chat, selectedUser, onClose }: ChatWindowProps) {
    const [messageText, setMessageText] = useState('');
    const [isTyping] = useState(false);
    const [showGrammarPreview, setShowGrammarPreview] = useState(false);
    //test purpose
    const [testText, setTestText] = useState('');
    const [showTestGrammarPreview, setShowTestGrammarPreview] = useState(false);
    const testInputRef = useRef<HTMLInputElement>(null);


    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const { user: currentUser } = useAuth();
    const { messages, loadChatMessages } = useChat();
    const { grammarResult, isChecking, error: grammarError, checkGrammar, clearGrammarCheck } = useGrammarCheck(1500); // 1.5 second debounce
    const {
        grammarResult: testGrammarResult,
        isChecking: testIsChecking,
        error: testGrammarError,
        checkGrammar: testCheckGrammar,
        clearGrammarCheck: testClearGrammarCheck
    } = useGrammarCheck(1500);
    const otherUser = chat.participants?.find(p => p.user.id !== currentUser?.id)?.user || selectedUser;

    useEffect(() => {
        if (!chat.id) return;
        loadChatMessages(chat.id);
    }, [chat.id, loadChatMessages]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        // Check grammar when message text changes
        if (messageText.trim().length > 6) { // Only check if more than 3 characters
            checkGrammar(messageText);
        } else {
            clearGrammarCheck();
        }
    }, [messageText, checkGrammar, clearGrammarCheck]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setMessageText(e.target.value);
    };

    // ADD TEST INPUT HANDLER
    const handleTestInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTestText(e.target.value);
    };


    const applyTestSuggestion = (error: GrammarError) => {
        const newText = testText.slice(0, error.startIndex) +
            error.suggestion +
            testText.slice(error.endIndex);
        setTestText(newText);

        setTimeout(() => {
            testInputRef.current?.focus();
        }, 100);
    };
    // Grammar check for test input
    useEffect(() => {
        if (testText.trim().length > 2) { // Start checking after 2 characters for testing
            console.log('🧪 Testing grammar for:', testText);
            testCheckGrammar(testText);
        } else {
            testClearGrammarCheck();
        }
    }, [testText, testCheckGrammar, testClearGrammarCheck]);


    const applySuggestion = (error: GrammarError) => {
        const newText = messageText.slice(0, error.startIndex) +
            error.suggestion +
            messageText.slice(error.endIndex);
        setMessageText(newText);

        // Focus back to input
        setTimeout(() => {
            inputRef.current?.focus();
        }, 100);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageText.trim()) return;

        // Clear grammar check when sending
        clearGrammarCheck();
        setShowGrammarPreview(false);

        console.log('Sending message:', messageText);
        setMessageText('');
    };

    const formatMessageTime = (timestamp: string) => {
        return new Date(timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const hasGrammarErrors = grammarResult?.hasErrors || false;
    const grammarErrors = grammarResult?.corrections || [];

    // TEST GRAMMAR VARIABLES
    const hasTestGrammarErrors = testGrammarResult?.hasErrors || false;
    const testGrammarErrors = testGrammarResult?.corrections || [];
    return (
        <div className="bg-white shadow rounded-lg flex flex-col h-96">
            {/* GRAMMAR TEST SECTION */}
            <div className="border-b-2 border-blue-200 bg-blue-50 p-4">
                <h4 className="text-sm font-medium text-blue-800 mb-2">🧪 Grammar Test Zone</h4>
                <div className="space-y-2">
                    <div className="relative">
                        <input
                            ref={testInputRef}
                            type="text"
                            value={testText}
                            onChange={handleTestInputChange}
                            placeholder="Type here to test grammar checking... (try: 'congr' or 'I are happy')"
                            className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${hasTestGrammarErrors ? 'border-red-300 bg-red-50' : 'border-gray-300'
                                }`}
                        />

                        {/* Test Grammar indicators */}
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                            {testIsChecking && (
                                <div className="animate-spin rounded-full h-4 w-4 border border-blue-500 border-t-transparent"></div>
                            )}

                            {hasTestGrammarErrors && (
                                <button
                                    type="button"
                                    onClick={() => setShowTestGrammarPreview(!showTestGrammarPreview)}
                                    className="text-red-500 hover:text-red-700"
                                    title="Show grammar suggestions"
                                >
                                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Test Grammar Status */}
                    <div className="flex items-center space-x-2 text-xs">
                        {testIsChecking && (
                            <span className="text-blue-600">Checking...</span>
                        )}
                        {testGrammarError && (
                            <span className="text-red-500">Error: {testGrammarError}</span>
                        )}
                        {hasTestGrammarErrors && (
                            <span className="text-yellow-600">
                                {testGrammarErrors.length} issue{testGrammarErrors.length !== 1 ? 's' : ''} found
                            </span>
                        )}
                        {testText.length > 2 && !testIsChecking && !hasTestGrammarErrors && (
                            <span className="text-green-600">✓ No issues found</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Test Grammar Preview */}
            {showTestGrammarPreview && hasTestGrammarErrors && (
                <div className="border-b border-yellow-200 bg-yellow-50 p-3">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <p className="text-xs font-medium text-yellow-800 mb-1">Test Grammar Preview:</p>
                            <div className="text-sm text-gray-700 bg-white p-2 rounded border">
                                <GrammarHighlight
                                    text={testText}
                                    errors={testGrammarErrors}
                                    onSuggestionClick={applyTestSuggestion}
                                />
                            </div>
                        </div>
                        <button
                            onClick={() => setShowTestGrammarPreview(false)}
                            className="ml-2 text-yellow-600 hover:text-yellow-800"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
            {/* Chat Header */}
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center">
                    <div className="h-8 w-8 bg-indigo-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium text-xs">
                            {otherUser?.displayName?.charAt(0).toUpperCase() || '?'}
                        </span>
                    </div>
                    <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                            {otherUser?.displayName || 'Unknown User'}
                        </p>
                        <p className="text-xs text-gray-500">
                            {isTyping ? 'Typing...' : 'Online'}
                        </p>
                    </div>
                </div>

                {/* Grammar Status Indicator */}
                <div className="flex items-center space-x-3">
                    {isChecking && (
                        <div className="flex items-center space-x-1 text-xs text-blue-600">
                            <div className="animate-spin rounded-full h-3 w-3 border border-blue-600 border-t-transparent"></div>
                            <span>Checking...</span>
                        </div>
                    )}

                    {hasGrammarErrors && (
                        <div className="flex items-center space-x-1 text-xs text-red-600">
                            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <span>{grammarErrors.length} issue{grammarErrors.length !== 1 ? 's' : ''}</span>
                        </div>
                    )}

                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-500 focus:outline-none"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                        <p>No messages yet. Start the conversation with {otherUser?.displayName || 'this user'}!</p>
                    </div>
                ) : (
                    messages.map((message) => {
                        const isCurrentUser = message.senderId === currentUser?.id;
                        return (
                            <div
                                key={message.id}
                                className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${isCurrentUser
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-200 text-gray-800'
                                        }`}
                                >
                                    <p className="text-sm">{message.content}</p>
                                    <p
                                        className={`text-xs mt-1 ${isCurrentUser ? 'text-indigo-200' : 'text-gray-500'
                                            }`}
                                    >
                                        {formatMessageTime(message.createdAt)}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Grammar Preview */}
            {showGrammarPreview && hasGrammarErrors && (
                <div className="border-t border-yellow-200 bg-yellow-50 p-3">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <p className="text-xs font-medium text-yellow-800 mb-1">Grammar Preview:</p>
                            <div className="text-sm text-gray-700 bg-white p-2 rounded border">
                                <GrammarHighlight
                                    text={messageText}
                                    errors={grammarErrors}
                                    onSuggestionClick={applySuggestion}
                                />
                            </div>
                        </div>
                        <button
                            onClick={() => setShowGrammarPreview(false)}
                            className="ml-2 text-yellow-600 hover:text-yellow-800"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Message Input */}
            <div className="border-t border-gray-200 p-4">
                <form onSubmit={handleSendMessage} className="space-y-2">
                    {/* Input with Grammar Highlighting */}
                    <div className="relative">
                        <input
                            ref={inputRef}
                            type="text"
                            value={messageText}
                            onChange={handleInputChange}
                            placeholder={`Message ${otherUser?.displayName || 'user'}...`}
                            className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${hasGrammarErrors ? 'border-red-300 bg-red-50' : 'border-gray-300'
                                }`}
                        />

                        {/* Grammar indicators */}
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                            {isChecking && (
                                <div className="animate-spin rounded-full h-4 w-4 border border-blue-500 border-t-transparent"></div>
                            )}

                            {hasGrammarErrors && (
                                <button
                                    type="button"
                                    onClick={() => setShowGrammarPreview(!showGrammarPreview)}
                                    className="text-red-500 hover:text-red-700"
                                    title="Show grammar suggestions"
                                >
                                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Send Button */}
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                            {grammarError && (
                                <span className="text-red-500">Grammar check failed</span>
                            )}
                            {hasGrammarErrors && (
                                <span className="text-yellow-600">
                                    {grammarErrors.length} grammar issue{grammarErrors.length !== 1 ? 's' : ''} found
                                </span>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={!messageText.trim()}
                            className={`px-6 py-2 rounded-lg font-medium transition-colors ${messageText.trim()
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                } focus:outline-none`}
                        >
                            Send
                            {hasGrammarErrors && (
                                <span className="ml-1 text-yellow-200">⚠️</span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
