import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  reasoning?: string; // reasoning (мышление)
  answer?: string;    // финальный ответ
  searchSources?: Array<{
    title: string;
    url: string;
    favicon?: string;
  }>; // источники веб-поиска
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  modelId: string;
  reasoningEnabled: boolean; // новый флаг
  webSearchEnabled: boolean; // флаг веб-поиска
}

interface ChatState {
  chats: Chat[];
  currentChatId: string | null;
  isLoading: boolean;
  error: string | null;
  createChat: (title: string, modelId?: string) => void;
  selectChat: (chatId: string) => void;
  deleteChat: (chatId: string) => void;
  sendMessage: (message: string, language?: string, apiKey?: string) => Promise<void>;
  clearError: () => void;
  toggleReasoning: (chatId: string) => void;
  toggleWebSearch: (chatId: string) => void;
  changeModel: (chatId: string, modelId: string) => void;
  deleteMessage: (chatId: string, messageId: string) => void;
  chatThemeLight: boolean; // true — светлая, false — тёмная
  toggleChatTheme: () => void;
  renameChat: (chatId: string, newTitle: string) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      chats: [],
      currentChatId: null,
      isLoading: false,
      error: null,
      chatThemeLight: false,
      toggleChatTheme: () => set((state) => ({ chatThemeLight: !state.chatThemeLight })),

      createChat: (title: string, modelId: string = 'neironka') => {
        const newChat: Chat = {
          id: Date.now().toString(),
          title,
          messages: [],
          modelId,
          reasoningEnabled: false,
          webSearchEnabled: false,
          createdAt: new Date(),
        };

        set((state) => ({
          chats: [newChat, ...state.chats],
          currentChatId: newChat.id,
        }));
      },

      selectChat: (chatId: string) => {
        set({ currentChatId: chatId });
      },

      deleteChat: (chatId: string) => {
        set((state) => ({
          chats: state.chats.filter((chat) => chat.id !== chatId),
          currentChatId: state.currentChatId === chatId ? (state.chats.length > 1 ? state.chats[0].id : null) : state.currentChatId,
        }));
      },

      sendMessage: async (message: string, language: string = 'ru', apiKey?: string) => {
        let state = get();
        let currentChat = state.chats.find((chat) => chat.id === state.currentChatId);

        // Если чата нет — создать автоматически
        if (!currentChat) {
          // Создаём новый чат с дефолтной моделью
          const modelId = state.chats[0]?.modelId || 'neironka';
          const title = 'Новый чат';
          const newChat = {
            id: Date.now().toString(),
            title,
            messages: [],
            modelId,
            reasoningEnabled: false,
            webSearchEnabled: false,
            createdAt: new Date(),
          };
          set((prev) => ({
            chats: [newChat, ...prev.chats],
            currentChatId: newChat.id,
          }));
          // Ждём появления currentChatId
          let waitCount = 0;
          while (!get().currentChatId && waitCount < 20) {
            await new Promise(res => setTimeout(res, 50));
            waitCount++;
          }
          state = get();
          currentChat = state.chats.find((chat) => chat.id === state.currentChatId);
          if (!currentChat) {
            set({ error: 'Не удалось создать чат' });
            return;
          }
        }

        if (!message.trim()) {
          set({ error: 'Сообщение не может быть пустым' });
          return;
        }

        // Добавляем сообщение пользователя
        const userMessage: Message = {
          id: Date.now().toString(),
          role: 'user',
          content: message,
          timestamp: new Date(),
        };

        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === state.currentChatId
              ? { ...chat, messages: [...chat.messages, userMessage] }
              : chat
          ),
          isLoading: true,
          error: null,
        }));

        try {
          const conversationHistory = currentChat.messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          }));

          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message,
              conversationHistory,
              modelId: currentChat.modelId,
              reasoningEnabled: currentChat.reasoningEnabled,
              webSearchEnabled: currentChat.webSearchEnabled,
              language,
              apiKey,
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Ошибка при обработке запроса');
          }

          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: data.answer || data.reasoning || '',
            timestamp: new Date(),
            reasoning: data.reasoning,
            answer: data.answer,
            searchSources: data.searchSources,
          };

          set((state) => ({
            chats: state.chats.map((chat) =>
              chat.id === state.currentChatId
                ? { ...chat, messages: [...chat.messages, aiMessage] }
                : chat
            ),
            isLoading: false,
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Ошибка при обработке запроса',
            isLoading: false,
          });
        }
      },

      clearError: () => {
        set({ error: null });
      },

      toggleReasoning: (chatId: string) => {
        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === chatId
              ? { ...chat, reasoningEnabled: !chat.reasoningEnabled }
              : chat
          ),
        }));
      },

      toggleWebSearch: (chatId: string) => {
        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === chatId
              ? { ...chat, webSearchEnabled: !chat.webSearchEnabled }
              : chat
          ),
        }));
      },

      changeModel: (chatId: string, modelId: string) => {
        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === chatId ? { ...chat, modelId } : chat
          ),
        }));
      },

      deleteMessage: (chatId: string, messageId: string) => {
        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === chatId
              ? { ...chat, messages: chat.messages.filter((msg) => msg.id !== messageId) }
              : chat
          ),
        }));
      },

      renameChat: (chatId: string, newTitle: string) => {
        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === chatId ? { ...chat, title: newTitle } : chat
          ),
        }));
      },
    }),
    {
      name: 'foxai-chat',
    }
  )
); 