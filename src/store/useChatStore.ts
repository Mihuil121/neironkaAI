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
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      chats: [],
      currentChatId: null,
      isLoading: false,
      error: null,

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
        const state = get();
        const currentChat = state.chats.find((chat) => chat.id === state.currentChatId);

        if (!currentChat) {
          set({ error: 'Чат не найден' });
          return;
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
    }),
    {
      name: 'foxai-chat',
    }
  )
); 