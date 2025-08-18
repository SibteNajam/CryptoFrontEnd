export interface GrammarError {
    original: string;
    suggestion: string;
    startIndex: number;
    endIndex: number;
    type: 'grammar' | 'spelling' | 'punctuation';
    message?: string;
}

export interface GrammarResponse {
    hasErrors: boolean;
    corrections: GrammarError[];
    originalText: string;
}