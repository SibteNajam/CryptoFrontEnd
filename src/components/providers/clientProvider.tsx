// frontend/src/components/ClientProvider.tsx
'use client';

import { Provider } from 'react-redux';
import { store } from '@/infrastructure/store';

export default function ClientProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    // Suppress verbose console output in non-development environments
    if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'development') {
        // Replace commonly noisy console methods with no-ops
        // Keep console.error available for visibility
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const noop = (..._args: any[]) => {};
        // eslint-disable-next-line no-console
        console.log = noop;
        // eslint-disable-next-line no-console
        console.debug = noop;
        // eslint-disable-next-line no-console
        console.info = noop;
        // eslint-disable-next-line no-console
        console.warn = noop;
    }

    return <Provider store={store}>{children}</Provider>;
}
