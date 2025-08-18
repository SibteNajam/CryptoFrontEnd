/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useRef } from 'react';
import { GrammarError } from '@/types/grammar';

interface InlineGrammarInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    grammarErrors: GrammarError[];
    isChecking: boolean;
    onSuggestionClick: (error: GrammarError) => void;
    className?: string;
}

export const InlineGrammarInput: React.FC<InlineGrammarInputProps> = ({
    value,
    onChange,
    placeholder,
    grammarErrors,
    isChecking,
    onSuggestionClick,
    className = '',
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const [showTooltip, setShowTooltip] = useState<{ error: GrammarError; x: number; y: number } | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);

    // Sync scroll position between input and overlay
    const handleScroll = () => {
        if (inputRef.current && overlayRef.current) {
            overlayRef.current.scrollLeft = inputRef.current.scrollLeft;
        }
    };

    // Handle input changes
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
        setShowTooltip(null); // Hide tooltip when typing
    };

    // Handle clicks on highlighted errors
    const handleErrorClick = (error: GrammarError, event: React.MouseEvent) => {
        event.preventDefault();
        onSuggestionClick(error);
        setShowTooltip(null);

        // Focus back to input
        setTimeout(() => {
            inputRef.current?.focus();
        }, 100);
    };

    // Handle hover for tooltips
    const handleErrorHover = (error: GrammarError, event: React.MouseEvent) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setShowTooltip({
            error,
            x: rect.left + rect.width / 2,
            y: rect.top - 10,
        });
    };

    // Render highlighted text with errors
    const renderHighlightedText = () => {
        if (!grammarErrors.length) {
            return <span className="text-transparent select-none">{value}</span>;
        }

        const sortedErrors = [...grammarErrors].sort((a, b) => a.startIndex - b.startIndex);
        const parts: React.ReactNode[] = [];
        let lastIndex = 0;

        sortedErrors.forEach((error, index) => {
            // Add text before error (transparent)
            if (error.startIndex > lastIndex) {
                parts.push(
                    <span key={`text-${index}`} className="text-transparent select-none">
                        {value.slice(lastIndex, error.startIndex)}
                    </span>
                );
            }

            // Add highlighted error
            const errorText = value.slice(error.startIndex, error.endIndex);
            const colorClass =
                error.type === 'grammar' ? 'border-b-2 border-red-500' :
                    error.type === 'spelling' ? 'border-b-2 border-blue-500' :
                        'border-b-2 border-yellow-500';

            parts.push(
                <span
                    key={`error-${index}`}
                    className={`${colorClass} cursor-pointer relative bg-transparent text-transparent select-none hover:bg-opacity-20 hover:bg-red-100`}
                    onClick={(e) => handleErrorClick(error, e)}
                    onMouseEnter={(e) => handleErrorHover(error, e)}
                    onMouseLeave={() => setShowTooltip(null)}
                    style={{
                        borderBottomStyle: 'wavy' as any,
                        textDecoration: 'none',
                    }}
                >
                    {errorText}
                </span>
            );

            lastIndex = error.endIndex;
        });

        // Add remaining text (transparent)
        if (lastIndex < value.length) {
            parts.push(
                <span key="text-final" className="text-transparent select-none">
                    {value.slice(lastIndex)}
                </span>
            );
        }

        return <>{parts}</>;
    };

    return (
        <div className="relative">
            {/* Hidden overlay with highlighted text */}
            <div
                ref={overlayRef}
                className={`absolute inset-0 pointer-events-auto overflow-hidden whitespace-nowrap ${className}`}
                style={{
                    fontSize: 'inherit',
                    fontFamily: 'inherit',
                    padding: '8px 16px', // Match input padding
                    border: '1px solid transparent', // Match input border
                    borderRadius: '0.5rem', // Match input border radius
                    lineHeight: '1.5',
                    zIndex: 1,
                }}
                onScroll={handleScroll}
            >
                {renderHighlightedText()}
            </div>

            {/* Actual input field */}
            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={handleInputChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onScroll={handleScroll}
                placeholder={placeholder}
                className={`relative z-10 bg-transparent ${className}`}
                style={{
                    caretColor: '#000', // Keep cursor visible
                }}
            />

            {/* Grammar checking indicator */}
            {isChecking && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 z-20">
                    <div className="animate-spin rounded-full h-4 w-4 border border-blue-500 border-t-transparent"></div>
                </div>
            )}

            {/* Grammar errors indicator */}
            {grammarErrors.length > 0 && !isChecking && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 z-20">
                    <svg className="h-4 w-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                </div>
            )}

            {/* Tooltip */}
            {showTooltip && (
                <div
                    className="fixed z-50 bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap pointer-events-none"
                    style={{
                        left: showTooltip.x,
                        top: showTooltip.y,
                        transform: 'translateX(-50%) translateY(-100%)',
                    }}
                >
                    <div className="font-medium">{showTooltip.error.type} error</div>
                    <div>Suggestion: {showTooltip.error.suggestion}</div>
                    <div className="text-gray-300">Click to fix</div>
                </div>
            )}
        </div>
    );
};