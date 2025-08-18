import { useState, useCallback, useRef } from 'react';
import { GrammarService } from '@/lib/grammar';
import { GrammarResponse } from '@/types/grammar';

export const useGrammarCheck = (debounceMs: number = 1000) => {
    const [grammarResult, setGrammarResult] = useState<GrammarResponse | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const checkGrammar = useCallback(async (text: string) => {
        // Clear previous timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Cancel previous request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Clear results if text is empty
        if (!text.trim()) {
            setGrammarResult(null);
            setIsChecking(false);
            setError(null);
            return;
        }

        // Set debounced grammar check
        timeoutRef.current = setTimeout(async () => {
            try {
                setIsChecking(true);
                setError(null);

                // Create new abort controller for this request
                abortControllerRef.current = new AbortController();

                console.log(' Checking grammar for:', text);
                const result = await GrammarService.checkGrammar(text);

                console.log(' Grammar check result:', result);
                setGrammarResult(result);
            } catch (err) {
                if (err instanceof Error && err.name !== 'AbortError') {
                    console.error('Grammar check failed:', err);
                    setError(err instanceof Error ? err.message : 'Grammar check failed');
                }
            } finally {
                setIsChecking(false);
            }
        }, debounceMs);
    }, [debounceMs]);

    const clearGrammarCheck = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        setGrammarResult(null);
        setIsChecking(false);
        setError(null);
    }, []);

    return {
        grammarResult,
        isChecking,
        error,
        checkGrammar,
        clearGrammarCheck,
    };
};
