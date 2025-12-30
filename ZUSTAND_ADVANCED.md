# Zustand Advanced Patterns

Advanced patterns dan tips untuk menggunakan Zustand di production.

## 🎯 Advanced Patterns

### 1. Computed State (Derived State)

Untuk state yang diturunkan dari state lain, gunakan selectors:

```typescript
import { create } from 'zustand';

interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

interface TodoState {
  todos: Todo[];
  addTodo: (title: string) => void;
  toggleTodo: (id: string) => void;
  
  // Computed properties
  completedCount: () => number;
  pendingCount: () => number;
  completionPercentage: () => number;
}

export const useTodoStore = create<TodoState>((set, get) => ({
  todos: [],
  
  addTodo: (title) =>
    set((state) => ({
      todos: [...state.todos, { id: Date.now().toString(), title, completed: false }],
    })),
  
  toggleTodo: (id) =>
    set((state) => ({
      todos: state.todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      ),
    })),
  
  // Computed selectors
  completedCount: () => get().todos.filter((t) => t.completed).length,
  pendingCount: () => get().todos.filter((t) => !t.completed).length,
  completionPercentage: () => {
    const todos = get().todos;
    if (todos.length === 0) return 0;
    return Math.round((get().completedCount() / todos.length) * 100);
  },
}));

// Usage
const completedCount = useTodoStore((state) => state.completedCount());
const pendingCount = useTodoStore((state) => state.pendingCount());
```

### 2. Async Actions dengan Immer

Menggunakan immer middleware untuk mutable-style updates:

```typescript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface DataState {
  data: any | null;
  loading: boolean;
  error: string | null;
  fetchData: (id: string) => Promise<void>;
  updateData: (updates: Partial<any>) => void;
}

export const useDataStore = create<DataState>()(
  immer((set) => ({
    data: null,
    loading: false,
    error: null,
    
    fetchData: async (id) => {
      set((state) => {
        state.loading = true;
        state.error = null;
      });
      
      try {
        const response = await fetch(`/api/data/${id}`);
        const data = await response.json();
        
        set((state) => {
          state.data = data;
          state.loading = false;
        });
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Unknown error';
          state.loading = false;
        });
      }
    },
    
    updateData: (updates) =>
      set((state) => {
        Object.assign(state.data, updates);
      }),
  }))
);
```

### 3. Multiple Stores Interaction

Stores dapat berinteraksi satu sama lain:

```typescript
// authStore.ts
export const useAuthStore = create((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  logout: () => {
    set({ user: null });
    // Call action dari store lain
    useUIStore.getState().reset();
    useDataStore.getState().clearData();
  },
}));

// uiStore.ts
export const useUIStore = create((set) => ({
  notifications: [],
  reset: () => set({ notifications: [] }),
}));

// dataStore.ts
export const useDataStore = create((set) => ({
  data: [],
  clearData: () => set({ data: [] }),
}));
```

### 4. Subscribe untuk Side Effects

Mendengarkan perubahan state tanpa component:

```typescript
const unsubscribe = useAuthStore.subscribe(
  (state) => state.user,
  (user) => {
    if (user) {
      console.log('User logged in:', user.name);
      // Trigger analytics, API calls, etc
      trackUserLogin(user.id);
    } else {
      console.log('User logged out');
    }
  }
);

// Unsubscribe when done
unsubscribe();
```

### 5. Factory Pattern untuk Multiple Stores

Membuat multiple instances dari store yang sama:

```typescript
interface CreateStoreParams {
  name: string;
  initialCount?: number;
}

const createCounterStore = (params: CreateStoreParams) =>
  create<CounterState>((set) => ({
    count: params.initialCount ?? 0,
    increment: () => set((state) => ({ count: state.count + 1 })),
    decrement: () => set((state) => ({ count: state.count - 1 })),
    reset: () => set({ count: params.initialCount ?? 0 }),
  }));

// Usage
export const useMainCounter = createCounterStore({ name: 'main', initialCount: 0 });
export const useSecondaryCounter = createCounterStore({ name: 'secondary', initialCount: 10 });
```

### 6. Persisting Partial State

Menyimpan hanya bagian tertentu dari state:

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Settings {
  theme: 'light' | 'dark';
  language: string;
  notifications: boolean;
  tempSetting: string; // Won't be persisted
}

export const useSettingsStore = create<Settings>()(
  persist(
    (set) => ({
      theme: 'light',
      language: 'en',
      notifications: true,
      tempSetting: '',
      
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setNotifications: (notifications) => set({ notifications }),
      setTempSetting: (tempSetting) => set({ tempSetting }),
    }),
    {
      name: 'settings-store',
      // Persist only specific keys
      partialize: (state) => ({
        theme: state.theme,
        language: state.language,
        notifications: state.notifications,
        // tempSetting akan diabaikan
      }),
    }
  )
);
```

### 7. Custom Hooks untuk Common Patterns

Membuat custom hooks untuk simplify penggunaan:

```typescript
// hooks/useAuth.ts
import { useAuthStore } from '@/store';

export const useAuth = () => {
  const user = useAuthStore((state) => state.user);
  const isLoggedIn = !!user;
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);
  
  return { user, isLoggedIn, setUser, logout };
};

// Usage dalam component
function MyComponent() {
  const { user, isLoggedIn, logout } = useAuth();
  
  if (!isLoggedIn) return <Login />;
  return <Dashboard user={user} onLogout={logout} />;
}
```

### 8. Time Travel Debugging

Dengan Redux DevTools, bisa rewind/forward state:

```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export const useStore = create(
  devtools(
    (set) => ({
      count: 0,
      increment: () => set((state) => ({ count: state.count + 1 }), false, 'increment'),
      decrement: () => set((state) => ({ count: state.count - 1 }), false, 'decrement'),
    }),
    { name: 'CounterStore', trace: true }
  )
);
```

Install Redux DevTools Chrome Extension untuk debug.

### 9. State Reset Helper

Utility function untuk reset store ke initial state:

```typescript
interface StoreWithReset {
  reset: () => void;
}

const createStoreWithReset = <T extends StoreWithReset>(
  initialState: T,
  createStore: (set: any) => T
) =>
  create<T>((set) => ({
    ...createStore(set),
    reset: () => set(initialState),
  }));
```

### 10. Combining Middleware

Menggunakan multiple middleware bersama-sama:

```typescript
import { create } from 'zustand';
import { devtools, persist, immer } from 'zustand/middleware';

export const useComplexStore = create<MyState>()(
  devtools(
    persist(
      immer((set) => ({
        // Mutable-style updates with immer
        // Persisted to localStorage
        // Debuggable with DevTools
      })),
      { name: 'complex-store' }
    ),
    { name: 'ComplexStore' }
  )
);
```

## 🎨 Best Practices

### ✅ DO

- **Satu store per feature/domain** - Separasi concerns
- **Gunakan selectors** - Prevent unnecessary re-renders
- **Atomic actions** - Simple, testable actions
- **Type everything** - Full TypeScript support
- **Use middleware** - persist, devtools, immer
- **Subscribe untuk side effects** - Decouple logic dari components
- **Create custom hooks** - Wrapper untuk common patterns

### ❌ DON'T

- **Avoid deep nesting** - Keep state flat
- **Don't mix concerns** - One store per domain
- **Don't forget selectors** - Can cause performance issues
- **Don't make huge stores** - Split into smaller ones
- **Don't destructure without useShallow** - Can cause unnecessary re-renders
- **Don't access store outside hooks** - Can lead to race conditions
- **Don't forget to unsubscribe** - Memory leaks

## 🧪 Testing

```typescript
import { renderHook, act } from '@testing-library/react';
import { useStore } from '@/store';

describe('Store', () => {
  beforeEach(() => {
    // Reset to initial state
    useStore.setState({ count: 0 });
  });

  it('should increment', () => {
    const { result } = renderHook(() => useStore());
    
    act(() => {
      result.current.increment();
    });
    
    expect(result.current.count).toBe(1);
  });
});
```

## 📚 Resources

- [Zustand Middleware](https://docs.pmnd.rs/zustand/integrations/persisting-store-data)
- [Zustand with Immer](https://docs.pmnd.rs/zustand/integrations/immer-middleware)
- [Redux DevTools Integration](https://docs.pmnd.rs/zustand/integrations/devtools)
- [Zustand Best Practices](https://github.com/pmndrs/zustand#best-practices)
