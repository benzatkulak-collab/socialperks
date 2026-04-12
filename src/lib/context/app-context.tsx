'use client';

import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import { showToast as globalShowToast } from '@/components/ui/toast';

// Toast notification type
interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

// Screen / view types
export type AppScreen = 'landing' | 'auth' | 'business' | 'influencer' | 'enterprise';

export type UserRole = 'business' | 'influencer' | null;

// App-wide state
interface AppState {
  theme: 'dark' | 'light';
  toasts: Toast[];
  loading: Record<string, boolean>;
  sidebarOpen: boolean;
  screen: AppScreen;
  userRole: UserRole;
}

type AppAction =
  | { type: 'SET_THEME'; payload: 'dark' | 'light' }
  | { type: 'ADD_TOAST'; payload: Toast }
  | { type: 'REMOVE_TOAST'; payload: string }
  | { type: 'SET_LOADING'; payload: { key: string; loading: boolean } }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_SCREEN'; payload: AppScreen }
  | { type: 'SET_USER_ROLE'; payload: UserRole }
  | { type: 'SET_AUTH'; payload: { screen: AppScreen; userRole: UserRole } }
  | { type: 'LOGOUT' };

const initialState: AppState = {
  theme: 'dark',
  toasts: [],
  loading: {},
  sidebarOpen: false,
  screen: 'landing',
  userRole: null,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'ADD_TOAST':
      return { ...state, toasts: [...state.toasts, action.payload] };
    case 'REMOVE_TOAST':
      return { ...state, toasts: state.toasts.filter(t => t.id !== action.payload) };
    case 'SET_LOADING':
      return { ...state, loading: { ...state.loading, [action.payload.key]: action.payload.loading } };
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen };
    case 'SET_SCREEN':
      return { ...state, screen: action.payload };
    case 'SET_USER_ROLE':
      return { ...state, userRole: action.payload };
    case 'SET_AUTH':
      return { ...state, screen: action.payload.screen, userRole: action.payload.userRole };
    case 'LOGOUT':
      return { ...state, screen: 'landing', userRole: null };
    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  showToast: (message: string, type?: Toast['type'], duration?: number) => void;
  setLoading: (key: string, loading: boolean) => void;
  setScreen: (screen: AppScreen) => void;
  setUserRole: (role: UserRole) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const showToast = useCallback((message: string, type: Toast['type'] = 'info', duration = 3000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    dispatch({ type: 'ADD_TOAST', payload: { id, message, type, duration } });
    // Bridge to the global ToastContainer so toasts render visually
    globalShowToast(type, message, duration);
    if (duration > 0) {
      setTimeout(() => dispatch({ type: 'REMOVE_TOAST', payload: id }), duration);
    }
  }, []);

  const setLoading = useCallback((key: string, loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: { key, loading } });
  }, []);

  const setScreen = useCallback((screen: AppScreen) => {
    dispatch({ type: 'SET_SCREEN', payload: screen });
  }, []);

  const setUserRole = useCallback((role: UserRole) => {
    dispatch({ type: 'SET_USER_ROLE', payload: role });
  }, []);

  const value = useMemo(
    () => ({ state, dispatch, showToast, setLoading, setScreen, setUserRole }),
    [state, showToast, setLoading, setScreen, setUserRole]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}

export function useToast() {
  const { showToast } = useAppContext();
  return showToast;
}

export function useLoading(key: string) {
  const { state, setLoading } = useAppContext();
  return { isLoading: !!state.loading[key], setLoading: (loading: boolean) => setLoading(key, loading) };
}
