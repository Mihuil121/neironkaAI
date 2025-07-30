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
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  fileContent?: string;
  downloadUrl?: string;
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
  abortController: AbortController | null; // Добавляем AbortController
  cancelledMessage: string | null; // Добавляем состояние для отмененного сообщения
  isThinking: boolean; // Добавляем состояние для процесса мышления
  isWebSearching: boolean; // Добавляем состояние для веб-поиска
  createChat: (title: string, modelId?: string) => void;
  selectChat: (chatId: string) => void;
  deleteChat: (chatId: string) => void;
  sendMessage: (message: string, language?: string, apiKey?: string, fileMeta?: { fileName?: string, fileType?: string, fileSize?: number, fileContent?: string }) => Promise<void>;
  cancelRequest: () => void; // Добавляем функцию отмены
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
      abortController: null, // Добавляем AbortController
      cancelledMessage: null,
      isThinking: false, // Добавляем состояние для процесса мышления
      isWebSearching: false, // Добавляем состояние для веб-поиска
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

      // Добавляем функцию отмены запроса
      cancelRequest: () => {
        const state = get();
        if (state.abortController) {
          state.abortController.abort();
          
          // Удаляем последнее сообщение пользователя и сохраняем его текст
          const currentChat = state.chats.find((chat) => chat.id === state.currentChatId);
          if (currentChat && currentChat.messages.length > 0) {
            const lastMessage = currentChat.messages[currentChat.messages.length - 1];
            if (lastMessage.role === 'user') {
              // Удаляем последнее сообщение пользователя
              set((state) => ({
                chats: state.chats.map((chat) =>
                  chat.id === state.currentChatId
                    ? { ...chat, messages: chat.messages.slice(0, -1) }
                    : chat
                ),
                isLoading: false,
                isThinking: false, // Останавливаем процесс мышления
                isWebSearching: false, // Останавливаем веб-поиск
                abortController: null,
                cancelledMessage: lastMessage.content, // Сохраняем текст отмененного сообщения
                error: 'Запрос отменен пользователем'
              }));
              return;
            }
          }
          
          set({ 
            isLoading: false,
            isThinking: false, // Останавливаем процесс мышления
            isWebSearching: false, // Останавливаем веб-поиск
            abortController: null,
            error: 'Запрос отменен пользователем'
          });
        }
      },

      sendMessage: async (message: string, language: string = 'ru', apiKey?: string, fileMeta?: { fileName?: string, fileType?: string, fileSize?: number, fileContent?: string }) => {
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
          ...(fileMeta || {})
        };

        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === state.currentChatId
              ? { ...chat, messages: [...chat.messages, userMessage] }
              : chat
          ),
          isLoading: true,
          isThinking: currentChat.reasoningEnabled, // Устанавливаем состояние мышления
          isWebSearching: currentChat.webSearchEnabled, // Устанавливаем состояние веб-поиска
          error: null,
        }));

        // Создаем AbortController для возможности отмены
        const abortController = new AbortController();
        set({ abortController });

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
              fileContent: fileMeta?.fileContent,
              fileName: fileMeta?.fileName,
            }),
            signal: abortController.signal, // Добавляем signal для отмены
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
            isThinking: false, // Останавливаем процесс мышления
            isWebSearching: false, // Останавливаем веб-поиск
            abortController: null, // Очищаем AbortController после успешного завершения
            cancelledMessage: null, // Очищаем отмененное сообщение при успешной отправке
          }));
        } catch (error) {
          // Проверяем, была ли отмена запроса
          if (error instanceof Error && error.name === 'AbortError') {
            set({
              error: 'Запрос отменен пользователем',
              isLoading: false,
              isThinking: false,
              isWebSearching: false,
              abortController: null,
            });
          } else {
          set({
            error: error instanceof Error ? error.message : 'Ошибка при обработке запроса',
            isLoading: false,
            isThinking: false,
            isWebSearching: false,
            abortController: null, // Очищаем AbortController при ошибке
          });
          }
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