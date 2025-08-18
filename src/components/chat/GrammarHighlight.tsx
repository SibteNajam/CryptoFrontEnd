'use client';

import React from 'react';
import { GrammarError } from '@/types/grammar';

interface GrammarHighlightProps {
    text: string;
    errors: GrammarError[];
    onSuggestionClick: (error: GrammarError) => void;
}

export const GrammarHighlight: React.FC<GrammarHighlightProps> = ({
    text,
    errors,
    onSuggestionClick,
}) => {
    if (!errors.length) {
        return <span>{text}</span>;
    }


    console.log('🎨 GrammarHighlight: text =', `"${text}"`);
    console.log('🎨 GrammarHighlight: errors =', errors);

    // Sort errors by start index to handle overlapping correctly
    const sortedErrors = [...errors].sort((a, b) => a.startIndex - b.startIndex);

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    sortedErrors.forEach((error, index) => {
        const extractedText = text.slice(error.startIndex, error.endIndex);
        console.log(`🎨 Error ${index}: "${error.original}" at ${error.startIndex}-${error.endIndex}, extracted: "${extractedText}"`);

        if (extractedText !== error.original) {
            console.error(`🎨 INDEX MISMATCH: Expected "${error.original}", got "${extractedText}"`);
            return; // Skip this error if indices are wrong
        }

        // Add text before the error
        if (error.startIndex > lastIndex) {
            const beforeText = text.slice(lastIndex, error.startIndex);
            console.log(`🎨 Adding before text: "${beforeText}"`);
            parts.push(beforeText);
        }

        // Add the highlighted error
        const errorText = text.slice(error.startIndex, error.endIndex);
        const errorKey = `error-${index}`;

        parts.push(
            <span
                key={errorKey}
                className={`relative cursor-pointer underline decoration-wavy ${error.type === 'grammar' ? 'decoration-red-500' :
                    error.type === 'spelling' ? 'decoration-blue-500' :
                        'decoration-yellow-500'
                    } hover:bg-gray-100 group`}
                onClick={() => {
                    console.log('🎨 Clicked error:', error);
                    onSuggestionClick(error);
                }}
                title={`${error.type}: ${error.original} → ${error.suggestion}`}
            >
                {errorText}

                {/* Tooltip */}
                <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-10 bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                    <div className="font-medium">{error.type} error</div>
                    <div>Suggestion: {error.suggestion}</div>
                    <div className="text-gray-300">Click to fix</div>
                </div>
            </span>
        );

        lastIndex = error.endIndex;
    });

    // Add remaining text
    if (lastIndex < text.length) {
        const remainingText = text.slice(lastIndex);
        console.log(`🎨 Adding remaining text: "${remainingText}"`);
        parts.push(remainingText);
    }

    console.log('🎨 Final parts:', parts);
    return <>{parts}</>;
};