# 📦 State Management dengan Zustand

Project ini menggunakan **Zustand** sebagai state management library yang ringan dan sederhana.

## 🎯 Kenapa Zustand?

| Aspek | Zustand | Redux Toolkit |
|-------|---------|---------------|
| Bundle Size | 📦 ~2KB | ~15KB |
| Setup | ⚡ Sangat Mudah | Complex |
| Boilerplate | Minimal | Banyak |
| Learning Curve | 🎓 Mudah | Steep |
| TypeScript | ✅ Excellent | Good |
| Production Ready | ✅ Yes | ✅ Yes |

## 🚀 Quick Start

### Instalasi
```bash
yarn add zustand
```

### Membuat Store
```typescript
// store/counterStore.ts
import { create } from 'zustand';

interface CounterState {
  count: number;
  increment: () => void;
  decrement: () => void;
}

export const useCounterStore = create<CounterState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
}));
```

### Menggunakan Store
```tsx
"use client";

import { useCounterStore } from '@/store/counterStore';

export function Counter() {
  const count = useCounterStore((state) => state.count);
  const increment = useCounterStore((state) => state.increment);
  const decrement = useCounterStore((state) => state.decrement);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>+</button>
      <button onClick={decrement}>-</button>
    </div>
  );
}
```

## 📁 Struktur Store

```
store/
├── authStore.ts          # 🔐 Authentication & user
├── uiStore.ts            # 🎨 UI state (theme, sidebar, notifications)
├── templateStore.ts      # 📄 Template management
└── index.ts              # Export semua stores
```

### Store yang Tersedia

#### 1. **Auth Store** (`useAuthStore`)
```typescript
const user = useAuthStore((state) => state.user);
const setUser = useAuthStore((state) => state.setUser);
const logout = useAuthStore((state) => state.logout);
```
- `user: User | null`
- `isLoading: boolean`
- `error: string | null`

#### 2. **UI Store** (`useUIStore`)
```typescript
const sidebarOpen = useUIStore((state) => state.sidebarOpen);
const toggleSidebar = useUIStore((state) => state.toggleSidebar);
const addNotification = useUIStore((state) => state.addNotification);
```
- `sidebarOpen: boolean`
- `theme: 'light' | 'dark'`
- `notifications: Array`

#### 3. **Template Store** (`useTemplateStore`)
```typescript
const templates = useTemplateStore((state) => state.templates);
const currentTemplate = useTemplateStore((state) => state.currentTemplate);
const addTemplate = useTemplateStore((state) => state.addTemplate);
```
- `templates: TemplateData[]`
- `currentTemplate: TemplateData | null`
- `isLoading: boolean`

## 💡 Best Practices

### ✅ Gunakan Selectors
```typescript
// Good - hanya re-render ketika user berubah
const user = useAuthStore((state) => state.user);

// Bad - re-render setiap state change
const { user } = useAuthStore();
```

### ✅ Atomic Actions
```typescript
// Good - simple, testable
setUser(userData);
setLoading(true);

// Bad - complex mutations
setState(complexLogic);
```

### ✅ Type Everything
Semua stores memiliki TypeScript types yang lengkap untuk type safety.

### ✅ Organize by Feature
Satu store per feature/domain untuk separasi concerns.

## 🔧 Middleware Support

### Persist (localStorage)
State otomatis tersimpan dan di-restore dari localStorage.

```typescript
import { persist } from 'zustand/middleware';

export const useStore = create(
  persist((set) => ({ /* ... */ }), {
    name: 'my-store',
  })
);
```

### DevTools (Debugging)
Gunakan Redux DevTools browser extension untuk debugging.

```typescript
import { devtools } from 'zustand/middleware';

export const useStore = create(
  devtools((set) => ({ /* ... */ }), {
    name: 'MyStore',
  })
);
```

### Immer (Mutable-style Updates)
Write immutable updates dengan mutable syntax.

```typescript
import { immer } from 'zustand/middleware/immer';

export const useStore = create(
  immer((set) => ({
    todos: [],
    addTodo: (title) =>
      set((state) => {
        state.todos.push({ id: Date.now().toString(), title });
      }),
  }))
);
```

## 📚 Dokumentasi Lengkap

- **[ZUSTAND_GUIDE.md](./ZUSTAND_GUIDE.md)** - Complete guide & API reference
- **[ZUSTAND_MIGRATION.md](./ZUSTAND_MIGRATION.md)** - Migration from Redux Toolkit
- **[ZUSTAND_ADVANCED.md](./ZUSTAND_ADVANCED.md)** - Advanced patterns & techniques
- **[components/examples/StoreUsageExample.tsx](./components/examples/StoreUsageExample.tsx)** - Example components

## 🎬 Example Components

File `components/examples/StoreUsageExample.tsx` berisi examples:
- `ExampleStoreUsage` - Using auth store
- `NotificationCenter` - Notification system
- `SidebarToggle` - Sidebar toggle

## 🧪 Testing Stores

```typescript
import { renderHook, act } from '@testing-library/react';
import { useAuthStore } from '@/store';

describe('Auth Store', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, isLoading: false, error: null });
  });

  it('should set user', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.setUser({ id: '1', name: 'John', email: 'john@example.com', role: 'user' });
    });

    expect(result.current.user?.name).toBe('John');
  });
});
```

Lihat `__tests__/stores.test.ts` untuk examples lebih lengkap.

## ❓ FAQ

**Q: Apakah Zustand cocok untuk large applications?**
A: Ya, banyak large apps menggunakan Zustand. Key adalah good architecture dengan store terpisah per feature.

**Q: Apakah butuh Provider setup?**
A: Tidak! Zustand stores bisa langsung digunakan tanpa Provider wrapper.

**Q: Bagaimana dengan server state?**
A: Untuk server state (API calls, caching), gunakan TanStack Query bersama Zustand untuk client state.

**Q: Bisakah saya menggunakan Zustand di Server Components?**
A: Tidak, Zustand hanya untuk client. Server Components menggunakan state dari parent atau props.

**Q: Bagaimana debugging?**
A: Install Redux DevTools extension dan setup devtools middleware di store.

## 🔗 Resources

- [Zustand GitHub](https://github.com/pmndrs/zustand)
- [Zustand Documentation](https://docs.pmnd.rs/zustand)
- [Redux DevTools Extension](https://github.com/reduxjs/redux-devtools)
- [Next.js State Management](https://nextjs.org/docs/app/building-your-application/data-fetching/patterns)

## 📦 Package Info

- **Library:** Zustand
- **Version:** 5.0.9
- **License:** MIT
- **Size:** ~2KB gzipped
- **Framework:** Next.js 16.1.1 (Turbopack)

---

**Last Updated:** December 23, 2025

**Happy State Management! 🚀**
