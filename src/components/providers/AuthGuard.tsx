'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/auth';
import TokenStorage from '@/lib/tokenStorage';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading, fetchCurrentUser, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isInitializing, setIsInitializing] = useState(true);

  // Check for existing token on mount and verify/restore auth state
  useEffect(() => {
    const initializeAuth = async () => {
      const token = TokenStorage.getAccessToken();
      
      console.log('🔐 AuthGuard: Initializing...', { 
        hasToken: !!token, 
        isAuthenticated, 
        hasUser: !!user 
      });
      
      if (token) {
        if (!isAuthenticated || !user) {
          // Token exists but user not in state - fetch current user
          console.log('🔄 AuthGuard: Token found, fetching current user...');
          try {
            await fetchCurrentUser();
            console.log('✅ AuthGuard: User restored from token');
          } catch (error) {
            console.error('❌ AuthGuard: Failed to fetch current user:', error);
            TokenStorage.clearTokens();
            localStorage.removeItem('reduxState');
          }
        } else {
          console.log('✅ AuthGuard: User already authenticated');
        }
      } else {
        console.log('⚠️ AuthGuard: No token found');
        // Clear any stale state
        localStorage.removeItem('reduxState');
      }
      
      setIsInitializing(false);
    };

    initializeAuth();
  }, []); // Run only once on mount

  // Handle navigation based on auth state
  useEffect(() => {
    if (isLoading || isInitializing) {
      console.log('⏳ AuthGuard: Loading...', { isLoading, isInitializing });
      return;
    }

    const isProtectedRoute = pathname.startsWith('/dashboard') || 
                           pathname.startsWith('/portfolio') || 
                           pathname.startsWith('/wallet') ||
                           pathname.startsWith('/app') ||
                           pathname.startsWith('/chat');
    const isAuthRoute = pathname === '/login' || pathname === '/signup';

    console.log('🛣️ AuthGuard: Route check', { 
      pathname, 
      isProtectedRoute, 
      isAuthRoute, 
      isAuthenticated 
    });

    if (!isAuthenticated && isProtectedRoute) {
      console.log('🚫 AuthGuard: Redirecting to login (protected route)');
      router.push('/login');
    } else if (isAuthenticated && isAuthRoute) {
      console.log('✅ AuthGuard: Redirecting to dashboard (already authenticated)');
      router.push('/dashboard');
    } else if (!isAuthenticated && pathname === '/') {
      console.log('🏠 AuthGuard: Redirecting to login (root)');
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, isInitializing, pathname, router]);

  if (isLoading || isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-200 border-t-primary"></div>
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}