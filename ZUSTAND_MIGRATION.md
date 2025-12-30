# Migration Guide: From Redux Toolkit to Zustand

## 📋 Overview

Zustand adalah state management library yang lebih ringan dan sederhana dibanding Redux Toolkit. Perfect untuk project yang ingin minimal boilerplate.

## 🔄 Comparison: Redux Toolkit vs Zustand

### Redux Toolkit Example
```typescript
// Redux Toolkit - Complex setup
import { createSlice } from '@reduxjs/toolkit';
import { configureStore } from '@reduxjs/toolkit';

const authSlice = createSlice({
  name: 'auth',
  initialState: { user: null },
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
    },
  },
});

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
  },
});

// Usage in component
import { useSelector, useDispatch } from 'react-redux';
const user = useSelector((state) => state.auth.user);
const dispatch = useDispatch();
dispatch(setUser(userData));
```

### Zustand Example
```typescript
// Zustand - Simple & Direct
import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));

// Usage in component
const user = useAuthStore((state) => state.user);
const setUser = useAuthStore((state) => state.setUser);
setUser(userData);
```

## 📊 Feature Comparison

| Feature | Redux Toolkit | Zustand |
|---------|---------------|---------|
| Bundle Size | ~15KB | ~2KB |
| Setup Complexity | High | Low |
| DevTools | Built-in | Via Middleware |
| Persist | Redux Persist | Via Middleware |
| Time Travel Debug | ✅ Yes | ✅ Yes (DevTools) |
| Middleware | Complex | Simple |
| Learning Curve | Steep | Easy |
| Production Ready | ✅ Yes | ✅ Yes |
| Community | Very Large | Growing |

## 🎯 When to use Zustand

✅ **Use Zustand if:**
- Simple to moderate state management needs
- Want minimal boilerplate
- Prefer lightweight library
- Building small to medium projects
- Don't need complex async actions
- Want fast development experience

❌ **Consider Redux Toolkit if:**
- Very complex state logic
- Need advanced DevTools features
- Have large team familiar with Redux
- Need extensive middleware ecosystem
- Enterprise application

## 🚀 Quick Start with Zustand

### 1. Install
```bash
yarn add zustand
```

### 2. Create Store
```typescript
import { create } from 'zustand';

interface AuthState {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  logout: () => set({ user: null }),
}));
```

### 3. Use in Component
```tsx
"use client";

import { useAuthStore } from '@/store';

export function MyComponent() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);

  return (
    <div>
      {user && <p>Hello, {user.name}</p>}
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

## 🛠️ Available Middleware

### 1. Persist (localStorage)
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useStore = create(
  persist(
    (set) => ({
      count: 0,
      increment: () => set((state) => ({ count: state.count + 1 })),
    }),
    {
      name: 'my-store', // localStorage key
    }
  )
);
```

### 2. DevTools (Debugging)
```typescript
import { devtools } from 'zustand/middleware';

export const useStore = create(
  devtools(
    (set) => ({
      // state & actions
    }),
    { name: 'MyStore' }
  )
);
```

### 3. Combine Multiple Middleware
```typescript
export const useStore = create(
  devtools(
    persist(
      (set) => ({
        // state & actions
      }),
      { name: 'store' }
    ),
    { name: 'MyStore' }
  )
);
```

## 📦 Project Stores Setup

Di project ini, semua stores sudah dibuat di folder `store/`:

```
store/
├── authStore.ts        # useAuthStore - user authentication
├── uiStore.ts          # useUIStore - UI state (sidebar, theme, etc)
├── templateStore.ts    # useTemplateStore - template management
└── index.ts            # Export all stores
```

## 💡 Best Practices

### 1. Use Selectors (Most Important!)
```typescript
// ✅ GOOD - Component only re-renders when user changes
const user = useAuthStore((state) => state.user);

// ❌ BAD - Component re-renders every state change
const { user } = useAuthStore();
```

### 2. Keep Actions Simple
```typescript
// ✅ Atomic actions are easy to test and understand
setUser(user);
setLoading(true);

// ❌ Avoid complex multi-step mutations
setState(newComplexState);
```

### 3. Type Everything
```typescript
// ✅ Full TypeScript support
interface MyState {
  user: User | null;
  setUser: (user: User | null) => void;
}

export const useMyStore = create<MyState>((set) => ({
  // ...
}));
```

### 4. Organize by Feature
Each store should handle one feature or domain:
- `authStore` - Authentication
- `uiStore` - UI state
- `templateStore` - Template data
- `desaStore` - Desa/village settings

### 5. Use `useShallow` for Multiple Values
```typescript
import { useShallow } from 'zustand/react';

// When selecting multiple values, use useShallow
const { user, isLoading } = useAuthStore(
  useShallow((state) => ({
    user: state.user,
    isLoading: state.isLoading,
  }))
);
```

## 🔗 Useful Links

- [Zustand GitHub](https://github.com/pmndrs/zustand)
- [Zustand Documentation](https://github.com/pmndrs/zustand/tree/main/docs)
- [Zustand API Reference](https://docs.pmnd.rs/zustand)
- [Redux DevTools Browser Extension](https://github.com/reduxjs/redux-devtools)

## ❓ FAQ

**Q: Can I use Zustand in server components?**
A: No, Zustand is for client-side state only. Use Server Components or TanStack Query for server state.

**Q: Do I need a provider?**
A: No! Zustand stores work directly without provider wrapper.

**Q: How do I share state between stores?**
A: Zustand stores are independent. You can import actions from one store in another.

**Q: Is Zustand suitable for large apps?**
A: Yes, many large apps use Zustand. The key is good architecture - one store per feature.

**Q: Can I migrate from Redux easily?**
A: Yes, stores map directly - reducers become set functions, actions become store functions.

---

**Last Updated:** December 23, 2025
**Framework:** Next.js 16.1.1 (Turbopack)
**State Management:** Zustand 5.0.9
