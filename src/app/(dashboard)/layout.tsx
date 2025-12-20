'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/layout/SideBar';
import Header from '../../components/layout/Header';
import { useAppSelector } from '@/infrastructure/store/hooks';
import TokenStorage from '@/infrastructure/login/tokenStorage';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check authentication on mount
    const token = TokenStorage.getAccessToken();
    const hasUser = !!user;

    console.log('🔐 Auth check - Token:', !!token, 'User:', hasUser);

    // If no token and no user, redirect to login
    if (!token && !hasUser) {
      console.log('❌ Not authenticated, redirecting to login');
      router.push('/login');
      return;
    }

    // If we have token but no user in Redux, try to restore from localStorage
    if (token && !hasUser) {
      console.log('🔄 Token exists but no user in Redux, checking persisted state...');
      try {
        const savedState = localStorage.getItem('reduxState');
        if (savedState) {
          const parsedState = JSON.parse(savedState);
          if (parsedState.auth?.user) {
            console.log('✅ User found in persisted state');
            // The store should restore this automatically
            setIsChecking(false);
          } else {
            console.log('⚠️ No user in persisted state, redirecting to login');
            router.push('/login');
          }
        } else {
          console.log('⚠️ No persisted state found, redirecting to login');
          router.push('/login');
        }
      } catch (err) {
        console.error('❌ Error checking persisted state:', err);
        router.push('/login');
      }
    } else {
      setIsChecking(false);
    }
  }, [user, router]);

  // Show loading state while checking auth
  if (isChecking && !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen  flex">
      {/* Sidebar */}
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />
      
      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${
        sidebarCollapsed ? 'ml-16' : 'ml-64'
      }`}>
        {/* Header */}
        <Header onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)} />
        
        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}