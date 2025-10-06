// frontend/src/components/ClientProvider.tsx
'use client';

import { Provider } from 'react-redux';
import { store } from '@/infrastructure/store';

export default function ClientProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    return <Provider store={store}>{children}</Provider>;
}
