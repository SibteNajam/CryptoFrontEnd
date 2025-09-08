// 'use client';

// import React, { useState } from 'react';
// import Sidebar from './SideBar';
// import Header from './Header';

// interface DashboardLayoutProps {
//   children: React.ReactNode;
// }

// export default function DashboardLayout({ children }: DashboardLayoutProps) {
//   const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

//   return (
//     <div className="min-h-screen bg-gray-50 flex">
//       {/* Sidebar */}
//       <Sidebar 
//         collapsed={sidebarCollapsed} 
//         onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
//       />
      
//       {/* Main Content Area */}
//       <div className={`flex-1 flex flex-col transition-all duration-300 ${
//         sidebarCollapsed ? 'ml-16' : 'ml-64'
//       }`}>
//         {/* Header */}
//         <Header onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)} />
        
//         {/* Page Content */}
//         <main className="flex-1 overflow-auto">
//           {children}
//         </main>
//       </div>
//     </div>
//   );
// }