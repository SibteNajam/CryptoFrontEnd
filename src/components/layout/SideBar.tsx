'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  BarChart3, 
  TrendingUp, 
  Activity, 
  Settings, 
  ChevronLeft,
  Home,
  Wallet,
  PieChart,
  Bell
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  // { name: 'Markets', href: '/markets', icon: TrendingUp },
  // { name: 'Trading', href: '/trading', icon: BarChart3 },
  { name: 'Portfolio', href: '/portfolio', icon: PieChart },
  // { name: 'Wallet', href: '/wallet', icon: Wallet },
  // { name: 'Analytics', href: '/analytics', icon: Activity },
  // { name: 'Alerts', href: '/alerts', icon: Bell },
  // { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className={`fixed left-0 top-0 h-full bg-card/90 backdrop-blur border-r border-default shadow-lg transition-all duration-300 z-40 ${
      collapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Logo Section */}
      <div className="h-16 flex items-center justify-between px-3 sm:px-4 border-b border-default">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <span className="text-xl font-bold text-primary">ByteBoom</span>
          </div>
        )}
        
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg hover-light transition-colors"
        >
          <ChevronLeft 
            size={20} 
            className={`text-muted-foreground transition-transform duration-300 ${
              collapsed ? 'rotate-180' : ''
            }`} 
          />
        </button>
      </div>

      {/* Navigation */}
      <nav className="mt-6 px-3">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'text-secondary hover-light text-card-foreground'
                  }`}
                >
                  <Icon 
                    size={20} 
                    className={`${
                      collapsed ? 'mr-0' : 'mr-3'
                    } transition-all duration-200 ${
                      isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-secondary'
                    }`} 
                  />
                  {!collapsed && (
                    <span className="transition-all duration-200">
                      {item.name}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Section */}
      {!collapsed && (
        <div className="absolute bottom-4 left-0 right-0 px-3">
          <div className="bg-gradient-light rounded-lg p-3 border border-info">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground text-sm font-semibold">SN</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-primary truncate">
                  SibteNajam
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  Premium User
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}