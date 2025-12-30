# State Management dengan Zustand

Project ini menggunakan **Zustand** untuk state management. Zustand dipilih karena lightweight (~2KB), simple API, dan great TypeScript support.

## 🎯 Keuntungan Zustand vs Redux Toolkit

| Aspek | Zustand | Redux Toolkit |
|-------|---------|---------------|
| Bundle Size | ~2KB | ~15KB |
| Setup Complexity | Simple | Complex |
| Provider Required | ❌ No | ✅ Yes |
| Learning Curve | Easy | Steep |
| Boilerplate | Minimal | Lots |
| TypeScript Support | Excellent | Good |

## 📁 Store Structure

```
store/
├── authStore.ts          # Authentication & user data
├── uiStore.ts            # UI state (sidebar, theme, notifications)
├── templateStore.ts      # Template data management
└── index.ts              # Export all stores
```

## 🚀 Cara Menggunakan

### Basic Usage (Client Component)

```tsx
"use client";

import { useAuthStore } from '@/store';

export function UserProfile() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  return (
    <div>
      <p>Hello, {user?.name}</p>
      <button onClick={() => setUser(null)}>Logout</button>
    </div>
  );
}
```

### Accessing Multiple Values

```tsx
// Cara 1: Destructure (tidak recommended karena tidak reactive per property)
const { user, setUser } = useAuthStore();

// Cara 2: Selector (RECOMMENDED - lebih efficient)
const user = useAuthStore((state) => state.user);
const setUser = useAuthStore((state) => state.setUser);

// Cara 3: Shallow equality untuk multiple values
import { useShallow } from 'zustand/react';
const { user, isLoading } = useAuthStore(
  useShallow((state) => ({ user: state.user, isLoading: state.isLoading }))
);
```

## 📝 Stores Tersedia

### 1. Auth Store (`useAuthStore`)
Mengelola authentication dan user data.

```tsx
const user = useAuthStore((state) => state.user);
const setUser = useAuthStore((state) => state.setUser);
const logout = useAuthStore((state) => state.logout);
```

**Properties:**
- `user: User | null` - Current user data
- `isLoading: boolean` - Loading state
- `error: string | null` - Error message

**Actions:**
- `setUser(user)` - Set current user
- `setLoading(loading)` - Set loading state
- `setError(error)` - Set error message
- `logout()` - Clear user data
- `reset()` - Reset to initial state

### 2. UI Store (`useUIStore`)
Mengelola UI state seperti sidebar, theme, notifications.

```tsx
const sidebarOpen = useUIStore((state) => state.sidebarOpen);
const toggleSidebar = useUIStore((state) => state.toggleSidebar);
const addNotification = useUIStore((state) => state.addNotification);
```

**Properties:**
- `sidebarOpen: boolean` - Sidebar open/close state
- `theme: 'light' | 'dark'` - Current theme
- `notifications: Array` - List of notifications

**Actions:**
- `toggleSidebar()` - Toggle sidebar
- `setSidebarOpen(open)` - Set sidebar state
- `setTheme(theme)` - Change theme
- `addNotification(notification)` - Add notification
- `removeNotification(id)` - Remove notification

### 3. Template Store (`useTemplateStore`)
Mengelola template data dan current template.

```tsx
const templates = useTemplateStore((state) => state.templates);
const currentTemplate = useTemplateStore((state) => state.currentTemplate);
const addTemplate = useTemplateStore((state) => state.addTemplate);
```

**Properties:**
- `templates: TemplateData[]` - List of templates
- `currentTemplate: TemplateData | null` - Currently selected template
- `isLoading: boolean` - Loading state

**Actions:**
- `setTemplates(templates)` - Set templates list
- `setCurrentTemplate(template)` - Set current template
- `addTemplate(template)` - Add new template
- `updateTemplate(id, updates)` - Update template
- `deleteTemplate(id)` - Delete template
- `setLoading(loading)` - Set loading state
- `reset()` - Reset to initial state

## 🔒 Persist & Devtools

Beberapa stores menggunakan middleware:

- **persist**: Menyimpan state ke localStorage
- **devtools**: DevTools browser integration untuk debugging

Gunakan Redux DevTools browser extension untuk debug Zustand stores.

## ✨ Best Practices

### 1. Gunakan Selectors
```tsx
// ✅ Good - hanya re-render ketika user berubah
const user = useAuthStore((state) => state.user);

// ❌ Bad - re-render setiap state berubah
const { user } = useAuthStore();
```

### 2. Combine Related Actions
```tsx
// ✅ Good - atomic actions
setUser(userData);
setLoading(true);

// Atau gunakan immer middleware untuk mutate-style updates
```

### 3. Use TypeScript
Semua stores fully typed dengan TypeScript untuk type safety.

## 🔄 Membuat Store Baru

Contoh membuat store baru:

```typescript
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface MyState {
  value: string;
  setValue: (value: string) => void;
}

export const useMyStore = create<MyState>()(
  devtools(
    persist(
      (set) => ({
        value: '',
        setValue: (value) => set({ value }),
      }),
      { name: 'my-store' }
    )
  )
);
```

## 📚 Resources

- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Zustand API Reference](https://github.com/pmndrs/zustand/tree/main/docs)
- [Redux DevTools Integration](https://github.com/pmndrs/zustand#redux-devtools)
