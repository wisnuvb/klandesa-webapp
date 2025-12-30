/**
 * Example tests for Zustand stores
 * These are examples of how to test Zustand stores
 */

import { renderHook, act } from "@testing-library/react";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";

describe("Auth Store", () => {
  // Reset store before each test
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      isLoading: false,
      error: null,
    });
  });

  it("should set user", () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.setUser({
        id: "1",
        name: "John Doe",
        email: "john@example.com",
        role: "admin",
      });
    });

    expect(result.current.user?.name).toBe("John Doe");
  });

  it("should logout", () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.setUser({
        id: "1",
        name: "John Doe",
        email: "john@example.com",
        role: "admin",
      });
    });

    expect(result.current.user).not.toBeNull();

    act(() => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
  });

  it("should set error", () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.setError("Authentication failed");
    });

    expect(result.current.error).toBe("Authentication failed");
  });

  it("should reset state", () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.setUser({
        id: "1",
        name: "John Doe",
        email: "john@example.com",
        role: "admin",
      });
      result.current.setLoading(true);
      result.current.setError("Some error");
    });

    expect(result.current.user).not.toBeNull();
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).not.toBeNull();

    act(() => {
      result.current.reset();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});

describe("UI Store", () => {
  beforeEach(() => {
    useUIStore.setState({
      sidebarOpen: true,
      theme: "light",
      notifications: [],
    });
  });

  it("should toggle sidebar", () => {
    const { result } = renderHook(() => useUIStore());

    const initialState = result.current.sidebarOpen;

    act(() => {
      result.current.toggleSidebar();
    });

    expect(result.current.sidebarOpen).toBe(!initialState);
  });

  it("should set sidebar open", () => {
    const { result } = renderHook(() => useUIStore());

    act(() => {
      result.current.setSidebarOpen(false);
    });

    expect(result.current.sidebarOpen).toBe(false);
  });

  it("should change theme", () => {
    const { result } = renderHook(() => useUIStore());

    act(() => {
      result.current.setTheme("dark");
    });

    expect(result.current.theme).toBe("dark");
  });

  it("should add notification", () => {
    const { result } = renderHook(() => useUIStore());

    act(() => {
      result.current.addNotification({
        message: "Test notification",
        type: "success",
      });
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].message).toBe("Test notification");
  });

  it("should remove notification", () => {
    const { result } = renderHook(() => useUIStore());

    let notificationId = "";

    act(() => {
      result.current.addNotification({
        message: "Test notification",
        type: "success",
      });
      notificationId = result.current.notifications[0].id;
    });

    expect(result.current.notifications).toHaveLength(1);

    act(() => {
      result.current.removeNotification(notificationId);
    });

    expect(result.current.notifications).toHaveLength(0);
  });
});
