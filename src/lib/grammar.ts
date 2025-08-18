const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
import { GrammarResponse } from '@/types/grammar';
export class GrammarService {
    static async checkGrammar(text: string): Promise<GrammarResponse> {
        if (!text.trim()) {
            return {
                hasErrors: false,
                corrections: [],
                originalText: text,
            };
        }

        const response = await fetch(`${API_BASE_URL}/grammar/check`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ text }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(' Grammar: Error response:', errorText);
            throw new Error('Failed to check grammar');
        }

        const result = await response.json();
        console.log('🔍 Grammar: Result:', result);

        return {
            ...result,
            originalText: text,
        };
    }
}
