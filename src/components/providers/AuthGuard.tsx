'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/auth';
import TokenStorage from '@/lib/tokenStorage';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading, fetchCurrentUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isInitializing, setIsInitializing] = useState(true);

  // Check for existing token on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const token = TokenStorage.getAccessToken();
      
      if (token && !isAuthenticated) {
        // Token exists but user not in state - fetch current user
        try {
          await fetchCurrentUser();
        } catch (error) {
          console.error('Failed to fetch current user:', error);
          TokenStorage.clearTokens();
        }
      }
      
      setIsInitializing(false);
    };

    initializeAuth();
  }, []);

  useEffect(() => {
    if (isLoading || isInitializing) return; // Wait for auth check

    const isProtectedRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/portfolio') || pathname.startsWith('/chat');
    const isAuthRoute = pathname === '/login' || pathname === '/signup';

    if (!isAuthenticated && isProtectedRoute) {
      router.push('/login');
    } else if (isAuthenticated && isAuthRoute) {
      router.push('/dashboard');
    } else if (!isAuthenticated && pathname === '/') {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, isInitializing, pathname, router]);

  if (isLoading || isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-200 border-t-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
}