"use client";

import React from 'react';
import { useAuthStore, useUIStore } from '@/store';
import { LogOut } from 'lucide-react';

/**
 * Contoh komponen yang menggunakan Zustand stores
 * Demonstrates how to use auth and UI stores
 */
export function ExampleStoreUsage() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  
  const addNotification = useUIStore((state) => state.addNotification);

  const handleLogout = () => {
    logout();
    addNotification({
      message: 'Logged out successfully',
      type: 'success',
    });
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h3 className="font-semibold">Zustand Store Example</h3>
      
      {user ? (
        <div className="space-y-2">
          <p>
            <span className="font-medium">User:</span> {user.name}
          </p>
          <p>
            <span className="font-medium">Email:</span> {user.email}
          </p>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      ) : (
        <p className="text-gray-500">No user logged in</p>
      )}
    </div>
  );
}

/**
 * Notification System Example
 */
export function NotificationCenter() {
  const notifications = useUIStore((state) => state.notifications);
  const removeNotification = useUIStore((state) => state.removeNotification);

  return (
    <div className="fixed top-4 right-4 space-y-2 z-50">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`p-4 rounded-lg text-white flex items-center justify-between gap-4 ${
            notification.type === 'success'
              ? 'bg-green-500'
              : notification.type === 'error'
              ? 'bg-red-500'
              : notification.type === 'warning'
              ? 'bg-yellow-500'
              : 'bg-blue-500'
          }`}
        >
          <span>{notification.message}</span>
          <button
            onClick={() => removeNotification(notification.id)}
            className="hover:opacity-75"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

/**
 * Sidebar Toggle Example
 */
export function SidebarToggle() {
  const sidebarOpen = useUIStore((state) => state.sidebarOpen);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);

  return (
    <button
      onClick={toggleSidebar}
      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
    >
      {sidebarOpen ? 'Close Sidebar' : 'Open Sidebar'}
    </button>
  );
}
