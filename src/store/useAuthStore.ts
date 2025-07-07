import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabaseClient';
import bcrypt from 'bcryptjs';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  created_at: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  language: string;
  apiKey: string;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, adminCode?: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  setLanguage: (lang: string) => void;
  setApiKey: (key: string) => void;
}

const ADMIN_SECRET = 'foxadmin2024'; // Можно вынести в .env

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      language: 'ru',
      apiKey: '',

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

          if (error || !data) {
            throw new Error('Пользователь не найден');
          }

          const isValid = await bcrypt.compare(password, data.password);
          if (!isValid) {
            throw new Error('Неверный пароль');
          }

          set({
            user: {
              id: data.id,
              email: data.email,
              name: data.name,
              role: data.role,
              created_at: data.created_at,
            },
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Ошибка входа',
            isLoading: false,
          });
        }
      },

      register: async (email: string, password: string, name: string, adminCode?: string) => {
        set({ isLoading: true, error: null });
        try {
          // Проверка существования пользователя
          const { data: existing } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();
          if (existing) {
            throw new Error('Пользователь уже существует');
          }

          const hashedPassword = await bcrypt.hash(password, 10);
          const role = adminCode === ADMIN_SECRET ? 'admin' : 'user';

          const { data, error } = await supabase
            .from('users')
            .insert([
              {
                email,
                password: hashedPassword,
                name,
                role,
              },
            ])
            .select()
            .single();

          if (error || !data) {
            throw new Error('Ошибка регистрации');
          }

          set({
            user: {
              id: data.id,
              email: data.email,
              name: data.name,
              role: data.role,
              created_at: data.created_at,
            },
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Ошибка регистрации',
            isLoading: false,
          });
        }
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          error: null,
        });
      },

      clearError: () => {
        set({ error: null });
      },

      setLanguage: (lang: string) => {
        set({ language: lang });
      },

      setApiKey: (key: string) => {
        set({ apiKey: key });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        language: state.language,
        apiKey: state.apiKey,
      }),
    }
  )
); 