'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore, Chat, Message } from '@/store/useChatStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useTranslation } from '@/lib/translations';
import MessageRenderer from './MessageRenderer';
import UploadDropdown from './UploadDropdown';
import SettingsModal from './SettingsModal';
import ShareModal from './ShareModal';
import styles from './ChatInterface.module.scss';
import { FiPlus, FiTrash2, FiLogOut, FiMessageSquare, FiUser, FiSend, FiUpload, FiSettings, FiX, FiZap, FiSearch, FiChevronDown, FiChevronUp, FiChevronLeft, FiChevronRight, FiShare2, FiMenu, FiCopy, FiRefreshCw, FiEdit2, FiGlobe } from 'react-icons/fi';
import { FaRobot } from 'react-icons/fa';
import Tesseract from 'tesseract.js';
import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image';
import AnimatedBotBall from './AnimatedBotBall';
import mammoth from 'mammoth';
import { useTheme } from 'next-themes';

interface Model {
  id: string;
  name: string;
  model_string: string;
}

const DEFAULT_MODELS: Model[] = [
  { id: 'neironka', name: 'Neironka', model_string: 'local-model' },
  { id: 'cypher', name: 'Cypher Alpha', model_string: 'openrouter/cypher-alpha:free' },
  { id: 'deepseek', name: 'DeepSeek: R1', model_string: 'deepseek/deepseek-r1-0528:free' },
  { id: 'qwen3', name: 'Qwen3', model_string: 'qwen/qwen3-30b-a3b:free' },
];

const CHUNK_SIZE = 4000; // символов

// Асинхронная обработка чанков с лимитом параллелизма
async function processChunksWithLimit<T, R>(chunks: T[], handler: (chunk: T, i: number) => Promise<R>, limit = 2): Promise<R[]> {
  const results: R[] = [];
  let idx = 0;
  async function next() {
    if (idx >= chunks.length) return;
    const current = idx++;
    results[current] = await handler(chunks[current], current);
    await next();
  }
  const workers = [];
  for (let i = 0; i < Math.min(limit, chunks.length); i++) {
    workers.push(next());
  }
  await Promise.all(workers);
  return results;
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} style={{margin: 8, padding: '6px 16px', borderRadius: 8, background: 'var(--accent)', color: 'var(--background)', border: 'none', fontWeight: 600, cursor: 'pointer'}}>
      {theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
    </button>
  );
}

function ProgressStage({ isThinking, chunkProgress, isLoading, reasoningEnabled, webSearchEnabled }: { isThinking: boolean, chunkProgress: any, isLoading: boolean, reasoningEnabled?: boolean, webSearchEnabled?: boolean }) {
  const { t } = useTranslation();
  if (!isThinking && !isLoading) return null;
  let stageText = t('status_idle');
  if (chunkProgress) {
    if (/ищем|search/i.test(chunkProgress.stage)) stageText = t('status_searching');
    else if (/анализ|reason/i.test(chunkProgress.stage)) stageText = t('status_reasoning');
    else if (/ответ|answer/i.test(chunkProgress.stage)) stageText = t('status_answering');
    else if (/ссылка|link/i.test(chunkProgress.stage)) stageText = t('status_extracting_links');
    else if (/источник|source/i.test(chunkProgress.stage)) stageText = t('status_studying_sources');
    else stageText = chunkProgress.stage;
    stageText += ` (${chunkProgress.current} из ${chunkProgress.total})`;
  } else if (isLoading) {
    if (reasoningEnabled) stageText = t('status_reasoning');
    else if (webSearchEnabled) stageText = t('status_searching');
    else stageText = t('status_idle');
  }
  return (
    <div className={styles.progressStage}>
      <FiZap className={styles.thinkingIcon} />
      <span>{stageText}</span>
      <span className={styles.thinkingDots}><span></span><span></span><span></span></span>
    </div>
  );
}

// Добавим компонент карточки источника
function SourceCard({ source }: { source: { title: string; url: string; favicon?: string } }) {
  const [imgError, setImgError] = useState(false);
  const isMobile = useMediaQuery('(max-width: 480px)');
  const { chatThemeLight } = useChatStore();
  return (
    <motion.a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      whileHover={{ scale: 1.06, boxShadow: chatThemeLight ? '0 4px 16px rgba(0,0,0,0.13)' : '0 4px 16px rgba(0,0,0,0.25)' }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        width: isMobile ? 120 : 180,
        height: isMobile ? 56 : 80,
        background: chatThemeLight ? '#fff' : '#23232a',
        color: chatThemeLight ? '#23232a' : '#fff',
        borderRadius: 12,
        boxShadow: chatThemeLight ? '0 2px 8px rgba(0,0,0,0.08)' : '0 2px 8px rgba(0,0,0,0.15)',
        border: chatThemeLight ? '1px solid #e5e7eb' : 'none',
        padding: isMobile ? 8 : 14,
        textDecoration: 'none',
        gap: isMobile ? 4 : 7,
        fontWeight: 500,
        fontSize: isMobile ? 13 : 15,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 5 : 8, marginBottom: isMobile ? 2 : 4 }}>
        {source.favicon && !imgError ? (
          <img
            src={source.favicon}
            alt="favicon"
            width={isMobile ? 18 : 24}
            height={isMobile ? 18 : 24}
            style={{ borderRadius: 4, background: chatThemeLight ? '#fff' : '#fff', boxShadow: '0 1px 4px #0002' }}
            onError={() => setImgError(true)}
          />
        ) : (
          <FiGlobe size={isMobile ? 18 : 24} color="#f59e42" style={{ background: '#fff', borderRadius: 4, boxShadow: '0 1px 4px #0002' }} />
        )}
        <span style={{ fontWeight: 600, fontSize: isMobile ? 13 : 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: isMobile ? 70 : 120 }}>{source.title}</span>
      </div>
      <span style={{ fontSize: isMobile ? 11 : 13, color: chatThemeLight ? '#f59e42' : '#f59e42', margin: isMobile ? '2px 0 0 0' : '4px 0 0 0', wordBreak: 'break-all', opacity: 0.85 }}>{source.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
      <div style={{ flex: 1 }} />
    </motion.a>
  );
}

// Хук для медиа-запроса
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);
  return matches;
}

// Добавляю компонент анимированного гамбургера
function AnimatedHamburger({ isOpen, onClick }: { isOpen: boolean, onClick: () => void }) {
  return (
    <button
      className={styles.menuBtn}
      onClick={onClick}
      title={isOpen ? 'Закрыть меню' : 'Открыть меню'}
      style={{
        width: 40,
        height: 40,
        background: 'none',
        border: 'none',
        padding: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        position: 'relative'
      }}
    >
      <span style={{ position: 'relative', width: 28, height: 22, display: 'block' }}>
        <motion.span
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 28,
            height: 3,
            borderRadius: 2,
            background: '#ff9900',
            display: 'block'
          }}
          animate={isOpen ? { rotate: 45, y: 9 } : { rotate: 0, y: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
        <motion.span
          style={{
            position: 'absolute',
            left: 0,
            top: 9.5,
            width: 28,
            height: 3,
            borderRadius: 2,
            background: '#ff9900',
            display: 'block'
          }}
          animate={isOpen ? { opacity: 0 } : { opacity: 1 }}
          transition={{ duration: 0.2 }}
        />
        <motion.span
          style={{
            position: 'absolute',
            left: 0,
            top: 19,
            width: 28,
            height: 3,
            borderRadius: 2,
            background: '#ff9900',
            display: 'block'
          }}
          animate={isOpen ? { rotate: -45, y: -9 } : { rotate: 0, y: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      </span>
    </button>
  );
}

export default function ChatInterface() {
  const [message, setMessage] = useState('');
  const [newChatTitle, setNewChatTitle] = useState('');
  const [models, setModels] = useState<Model[]>(DEFAULT_MODELS);
  const [fileLoading, setFileLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showUploadDropdown, setShowUploadDropdown] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    chats,
    currentChatId,
    isLoading,
    error,
    sendMessage,
    createChat,
    deleteChat,
    selectChat,
    changeModel,
    toggleReasoning,
    toggleWebSearch,
    clearError,
    chatThemeLight,
    renameChat, // добавили
  } = useChatStore();
  const { user, logout, setLanguage, apiKey, setApiKey } = useAuthStore();
  const [collapsedReasoning, setCollapsedReasoning] = useState<{ [msgId: string]: boolean }>({});
  const [searchSourcesUI, setSearchSourcesUI] = useState<any[]>([]);
  const [webSearchResults, setWebSearchResults] = useState<any[]>([]);
  const prevWebSearchEnabled = useRef(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [chunkProgress, setChunkProgress] = useState<{stage: string, current: number, total: number} | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [mobileBtnHover, setMobileBtnHover] = useState<string | null>(null);
  const [mobileBtnActive, setMobileBtnActive] = useState<string | null>(null);

  const { t, language } = useTranslation();

  const isMobile = useMediaQuery('(max-width: 767px)');
  const isVerySmall = useMediaQuery('(max-width: 420px)');

  // Выбранный чат
  const currentChat = chats.find((c) => c.id === currentChatId);

  // Получение моделей из Supabase или fallback на дефолтные
  useEffect(() => {
    async function fetchModels() {
      try {
        const { data } = await supabase.from('models').select('*').order('created_at', { ascending: true });
        if (data && data.length > 0) {
          setModels(data);
        } else {
          setModels(DEFAULT_MODELS);
        }
      } catch {
        setModels(DEFAULT_MODELS);
      }
    }
    fetchModels();
  }, []);

  useEffect(() => {
    if (!currentChatId && chats.length > 0) {
      selectChat(chats[0].id);
    }
  }, [chats, currentChatId, selectChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentChat?.messages]);

  // Следим за появлением новых результатов поиска только при webSearchEnabled
  useEffect(() => {
    if (currentChat?.webSearchEnabled) {
      // Если только что включили веб-поиск — сбрасываем результаты
      if (!prevWebSearchEnabled.current) {
        setWebSearchResults([]);
      }
      // Ищем последние searchSources среди сообщений ассистента
      const lastSources = [...(currentChat.messages || [])]
        .reverse()
        .find((msg) => Array.isArray(msg.searchSources) && msg.searchSources.length > 0)?.searchSources;
      if (lastSources && lastSources.length > 0) {
        // Преобразуем строки в объекты, если нужно
        const sources = lastSources.map((s: any) => {
          if (typeof s === 'string') {
            try {
              const urlObj = new URL(s);
              return {
                title: urlObj.hostname,
                url: s,
                favicon: `https://www.google.com/s2/favicons?domain=${urlObj.hostname}`
              };
            } catch {
              return { title: s, url: s, favicon: '' };
            }
          }
          return s;
        });
        setWebSearchResults(sources);
      }
    } else {
      setWebSearchResults([]);
    }
    prevWebSearchEnabled.current = !!currentChat?.webSearchEnabled;
  }, [currentChat?.webSearchEnabled, currentChat?.messages]);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated && (!currentChatId || chats.length === 0)) {
      // Если нет чата — создаём автоматически
      createChat(t('newChat'), models[0]?.id || 'neironka');
    }
  }, [isHydrated, currentChatId, chats.length, createChat, models]);

  const compressText = async (text: string, apiKey: string, language: string) => {
    // Новый способ: отправляем на /api/compress, не добавляя в чат
    try {
      const response = await fetch('/api/compress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language, apiKey, modelId: currentChat?.modelId || 'neironka' })
      });
      const data = await response.json();
      return data.result || '';
    } catch {
      return '';
    }
  };

  const handleLargeText = async (text: string) => {
    setIsThinking(true);
    let chunks = [];
    for (let i = 0; i < text.length; i += CHUNK_SIZE) {
      chunks.push(text.slice(i, i + CHUNK_SIZE));
    }
    let compressedChunks: string[] = [];
    compressedChunks = await processChunksWithLimit(
      chunks,
      async (chunk, i) => {
        setChunkProgress({ stage: 'Сжимаем', current: i + 1, total: chunks.length });
        return await compressText(chunk, apiKey, language);
      },
      2 // лимит параллелизма
    );
    let result = compressedChunks.join('\n');
    // Если результат всё ещё большой — повторить
    let stage = 2;
    while (result.length > 5000 && stage < 10) {
      const newChunks = [];
      for (let i = 0; i < result.length; i += CHUNK_SIZE) {
        newChunks.push(result.slice(i, i + CHUNK_SIZE));
      }
      let newCompressed: string[] = [];
      newCompressed = await processChunksWithLimit(
        newChunks,
        async (chunk, i) => {
          setChunkProgress({ stage: `Сжимаем (этап ${stage})`, current: i + 1, total: newChunks.length });
          return await compressText(chunk, apiKey, language);
        },
        2
      );
      result = newCompressed.join('\n');
      stage++;
    }
    setChunkProgress({ stage: 'Финальный ответ', current: 1, total: 1 });
    if (result.length > 5000) {
      alert('Не удалось сжать текст до нужного размера. Попробуйте другой текст или файл.');
      setChunkProgress(null);
      setIsThinking(false);
      return;
    }
    // После сжатия сразу отправляем финальный результат
    try {
      await sendMessage(result, language, apiKey);
    } finally {
      setIsThinking(false);
      setMessage('');
      setUploadedFile(null);
      setChunkProgress(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(message.trim() || uploadedFile) || isLoading) return;
    setMessage(''); // Очищаем инпут сразу после отправки!
    // Если нет активного чата — создать его автоматически
    if (!currentChatId) {
      createChat(t('newChat'), models[0]?.id || 'neironka');
      // Ждём, пока currentChatId появится (асинхронно)
      let waitCount = 0;
      while (!useChatStore.getState().currentChatId && waitCount < 20) {
        await new Promise(res => setTimeout(res, 50));
        waitCount++;
      }
    }
    const chatId = useChatStore.getState().currentChatId;
    if (!chatId) {
      alert('Не удалось создать чат. Попробуйте ещё раз.');
      return;
    }
    if (uploadedFile) {
      // 1. Считать содержимое файла
      let fileContent = '';
      try {
        if (uploadedFile.type.startsWith('image/')) {
          const { data: { text } } = await Tesseract.recognize(uploadedFile, 'eng+rus');
          fileContent = text;
        } else if (uploadedFile.type === 'application/pdf') {
          fileContent = await extractTextFromPDF(uploadedFile);
        } else if (uploadedFile.type.startsWith('text/') || uploadedFile.type === 'application/json') {
          fileContent = await uploadedFile.text();
        } else if (uploadedFile.name.endsWith('.docx')) {
          const arrayBuffer = await uploadedFile.arrayBuffer();
          const { value } = await mammoth.extractRawText({ arrayBuffer });
          fileContent = value;
        } else if (uploadedFile.name.endsWith('.doc')) {
          alert('Формат .doc поддерживается ограниченно. Попробуйте сначала сохранить файл как .docx.');
          fileContent = '';
        }
      } catch (err) {
        fileContent = `[Ошибка извлечения текста из файла "${uploadedFile.name}"]`;
      }
      // 2. Если файл большой — сжать
      if (fileContent.length > CHUNK_SIZE) {
        setIsThinking(true);
        let compressed = '';
        try {
          let chunks = [];
          for (let i = 0; i < fileContent.length; i += CHUNK_SIZE) {
            chunks.push(fileContent.slice(i, i + CHUNK_SIZE));
          }
          let compressedChunks: string[] = [];
          compressedChunks = await processChunksWithLimit(
            chunks,
            async (chunk, i) => {
              setChunkProgress({ stage: 'Сжимаем', current: i + 1, total: chunks.length });
              return await compressText(chunk, apiKey, language);
            },
            2
          );
          let result = compressedChunks.join('\n');
          let stage = 2;
          while (result.length > 5000 && stage < 10) {
            const newChunks = [];
            for (let i = 0; i < result.length; i += CHUNK_SIZE) {
              newChunks.push(result.slice(i, i + CHUNK_SIZE));
            }
            let newCompressed: string[] = [];
            newCompressed = await processChunksWithLimit(
              newChunks,
              async (chunk, i) => {
                setChunkProgress({ stage: `Сжимаем (этап ${stage})`, current: i + 1, total: newChunks.length });
                return await compressText(chunk, apiKey, language);
              },
              2
            );
            result = newCompressed.join('\n');
            stage++;
          }
          setChunkProgress({ stage: 'Финальный ответ', current: 1, total: 1 });
          if (result.length > 5000) {
            alert('Не удалось сжать текст до нужного размера. Попробуйте другой текст или файл.');
            setChunkProgress(null);
            setIsThinking(false);
            return;
          }
          compressed = result;
        } finally {
          setIsThinking(false);
          setChunkProgress(null);
        }
        fileContent = compressed;
      }
      // 3. Собрать единое сообщение
      let finalMessage = '';
      if (message.trim() && fileContent.trim()) {
        finalMessage = message.trim();
      } else if (fileContent.trim()) {
        finalMessage = 'Поясни содержимое файла';
      } else if (message.trim()) {
        finalMessage = message.trim();
      } else {
        finalMessage = '[Ошибка: нет данных для отправки]';
      }
      setIsThinking(true);
      try {
        await sendMessage(finalMessage, language, apiKey, {
          fileName: uploadedFile.name,
          fileType: uploadedFile.type,
          fileSize: uploadedFile.size,
          fileContent: fileContent // добавляем содержимое файла
        });
      } finally {
        setIsThinking(false);
      }
      setMessage('');
      setUploadedFile(null);
      const textarea = document.querySelector('textarea.' + styles.inputBarInput) as HTMLTextAreaElement | null;
      if (textarea) textarea.style.height = 'auto';
      return;
    }
    // Если длинный текст (без файла)
    if (message.trim().length > 5000) {
      await handleLargeText(message.trim());
      setMessage('');
      const textarea = document.querySelector('textarea.' + styles.inputBarInput) as HTMLTextAreaElement | null;
      if (textarea) textarea.style.height = 'auto';
      return;
    }
    // Обычное сообщение
    let finalMessage = message.trim();
    setIsThinking(true);
    try {
      await sendMessage(finalMessage, language, apiKey);
    } finally {
      setIsThinking(false);
    }
    setMessage('');
    setUploadedFile(null);
    const textarea = document.querySelector('textarea.' + styles.inputBarInput) as HTMLTextAreaElement | null;
    if (textarea) textarea.style.height = 'auto';
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleCreateChat = () => {
    createChat(newChatTitle.trim() || t('newChat'), models[0]?.id || 'neironka');
    setNewChatTitle('');
  };

  const handleModelChange = (id: string) => {
    if (currentChatId) changeModel(currentChatId, id);
  };

  const handleToggleReasoning = () => {
    if (currentChatId) toggleReasoning(currentChatId);
  };

  const handleToggleWebSearch = () => {
    if (currentChatId) toggleWebSearch(currentChatId);
  };

  const handleFileUpload = async (file: File) => {
    setFileLoading(true);
    try {
      if (file.type.startsWith('image/') || 
          file.type === 'application/pdf' || 
          file.type.startsWith('text/') || 
          file.type === 'application/json' ||
          file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
        // Просто сохраняем файл, не обрабатываем сразу
        setUploadedFile(file);
      } else {
        alert('Формат файла не поддерживается.');
      }
    } catch (err) {
      alert('Ошибка при загрузке файла');
    } finally {
      setFileLoading(false);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleFileUpload(file);
    }
  };

  const handleImageUpload = async (file: File) => {
    setFileLoading(true);
    
    try {
      if (file.type.startsWith('image/')) {
        setUploadedFile(file);
      } else {
        alert('Пожалуйста, выберите изображение.');
      }
    } catch (err) {
      alert('Ошибка при загрузке изображения');
    } finally {
      setFileLoading(false);
    }
  };

  const handleYouTubeUpload = async (url: string) => {
    setFileLoading(true);
    
    try {
      const response = await fetch('/api/youtube-transcript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка получения транскрипта');
      }

      // Создаем виртуальный файл с транскриптом
      const transcriptFile = new File(
        [data.transcript],
        `youtube-transcript-${data.videoId}.txt`,
        { type: 'text/plain' }
      );

      setUploadedFile(transcriptFile);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка при получении транскрипта';
      console.error('YouTube transcript error:', err);
      
      // Показываем более информативное сообщение об ошибке
      if (errorMessage.includes('Таймаут') || errorMessage.includes('соединение')) {
        alert(`⚠️ ${errorMessage}\n\nВозможные решения:\n• Проверьте интернет-соединение\n• Попробуйте позже\n• Убедитесь, что видео имеет субтитры`);
      } else {
        alert(`❌ ${errorMessage}`);
      }
    } finally {
      setFileLoading(false);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
  };

  async function extractTextFromPDF(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async function () {
        // @ts-ignore
        const pdfjsLib = await import('pdfjs-dist/build/pdf');
        // @ts-ignore
        pdfjsLib.GlobalWorkerOptions.workerSrc = '//cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js';
        const typedarray = new Uint8Array(reader.result as ArrayBuffer);
        pdfjsLib.getDocument({ data: typedarray }).promise.then(async (pdf: any) => {
          let text = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map((item: any) => item.str).join(' ') + '\n';
          }
          resolve(text);
        });
      };
      reader.readAsArrayBuffer(file);
    });
  }

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
  };

  const handleRegenerate = async (msg: Message) => {
    if (isLoading || isThinking || !currentChat) return;
    // Найти последнее сообщение пользователя перед этим AI-ответом
    const idx = currentChat.messages.findIndex(m => m.id === msg.id);
    if (idx === -1) return;
    // Ищем назад первое сообщение пользователя
    let userMsg = null;
    for (let i = idx - 1; i >= 0; i--) {
      if (currentChat.messages[i].role === 'user') {
        userMsg = currentChat.messages[i];
        break;
      }
    }
    if (!userMsg || !userMsg.content) return;
    setIsThinking(true);
    try {
      await sendMessage(userMsg.content, language, apiKey);
    } finally {
      setIsThinking(false);
    }
  };

  function shortenFileName(name?: string) {
    if (!name) return '';
    const dotIdx = name.lastIndexOf('.');
    const ext = dotIdx !== -1 ? name.slice(dotIdx) : '';
    const base = dotIdx !== -1 ? name.slice(0, dotIdx) : name;
    if (base.length <= 6) return name;
    return base.slice(0, 2) + '...' + ext;
  }

  if (!isHydrated) {
    return null; // или можно показать лоадер
  }

  // Перед currentChat.messages.map(...)
  const lastAssistantIdx = currentChat?.messages ? [...currentChat.messages].reverse().findIndex(m => m.role === 'assistant' && !m.reasoning) : -1;
  const lastAssistantId = lastAssistantIdx !== -1 && currentChat?.messages ? currentChat.messages[currentChat.messages.length - 1 - lastAssistantIdx].id : null;

  return (
    <>
      <div className={styles.wrapper} data-chat-theme={chatThemeLight ? 'light' : 'dark'}>
        {/* Sidebar (desktop/tablet only) */}
        <aside className={styles.sidebar + (isSidebarCollapsed ? ' ' + styles.sidebarCollapsed : '')}>
          <div className={styles.sidebarHeader}>
            <AnimatedBotBall size={32} />
            <span
              className={styles.appName}
              style={{ color: chatThemeLight ? '#000' : '#ededed' }}
            >
              Neironka Ai
            </span>
            <button
              className={styles.collapseBtn}
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              title={isSidebarCollapsed ? 'Развернуть' : 'Свернуть'}
            >
              {isSidebarCollapsed ? <FiChevronRight /> : <FiChevronLeft />}
            </button>
          </div>
          <div className={styles.chatsList}>
            <div className={styles.chatsHistoryTitle}>{t('chatHistory')}</div>
            {chats.length === 0 && (
              <div className={styles.emptyChats}><FiMessageSquare /> {t('noChats')}</div>
            )}
            {chats.map((chat) => (
              <div
                key={chat.id}
                className={
                  chat.id === currentChatId
                    ? styles.chatItemActive
                    : styles.chatItem
                }
                onClick={() => selectChat(chat.id)}
              >
                <span className={styles.chatTitle}
                  style={{ color: chatThemeLight ? '#23232a' : '#fff' }}
                >
                  <FiMessageSquare style={{marginRight: 6}} />
                  {editingChatId === chat.id ? (
                    <input
                      type="text"
                      value={editingTitle}
                      autoFocus
                      onChange={e => setEditingTitle(e.target.value)}
                      onBlur={() => {
                        if (editingTitle.trim() && editingTitle !== chat.title) renameChat(chat.id, editingTitle.trim());
                        setEditingChatId(null);
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          if (editingTitle.trim() && editingTitle !== chat.title) renameChat(chat.id, editingTitle.trim());
                          setEditingChatId(null);
                        } else if (e.key === 'Escape') {
                          setEditingChatId(null);
                        }
                      }}
                      className={styles.renameInput}
                      style={{fontSize: '1em', padding: '2px 6px', borderRadius: 4, border: '1px solid #888', width: '80%'}}
                    />
                  ) : (
                    <>
                      {chat.title}
                      {chat.id === currentChatId && (
                        <button
                          className={styles.renameBtn}
                          style={{marginLeft: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#aaa'}}
                          title="Переименовать чат"
                          onClick={e => { e.stopPropagation(); setEditingChatId(chat.id); setEditingTitle(chat.title); }}
                        >
                          <FiEdit2 size={15} />
                        </button>
                      )}
                    </>
                  )}
                </span>
                <div className={styles.chatActions}>
                  <button
                    className={styles.shareChatBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowShareModal(true);
                    }}
                    title="Поделиться чатом"
                  >
                    <FiShare2 />
                  </button>
                  <button
                    className={styles.deleteChatBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteChat(chat.id);
                    }}
                    title={t('deleteChat')}
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className={styles.newChatBox}>
            <input
              type="text"
              placeholder={t('chatTitle')}
              value={newChatTitle}
              onChange={(e) => setNewChatTitle(e.target.value)}
              className={styles.newChatInput}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateChat();
              }}
            />
            <button className={styles.newChatBtn} onClick={handleCreateChat} title={t('newChat')}>
              <FiPlus />
            </button>
          </div>
          <div className={styles.sidebarFooter}>
            <div className={styles.userInfoSidebar}>
              <span className={styles.avatarSidebar}><FiUser /></span>
              <span className={styles.userNameSidebar}>{user?.name || t('user')}</span>
            </div>
            <button className={styles.logoutSidebar} onClick={logout} title={t('logout')}>
              <FiLogOut />
            </button>
          </div>
        </aside>
        {/* Кнопка для разворачивания sidebar */}

        {/* Мобильное меню (гамбургер) */}
        {typeof window !== 'undefined' && window.innerWidth <= 767 && (
          <>
            <div className={styles.mobileHeader}>
              <AnimatedBotBall size={32} />
              <span className={styles.appName} style={{ color: chatThemeLight ? '#000' : '#ededed' }}>Neironka Ai</span>
              <AnimatedHamburger isOpen={mobileMenuOpen} onClick={() => setMobileMenuOpen(!mobileMenuOpen)} />
            </div>
            {mobileMenuOpen && (
              <AnimatePresence initial={false}>
                <motion.div
                  key="mobile-menu-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={styles.mobileMenuOverlay}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <motion.div
                    key="mobile-menu"
                    initial={{ x: '100%', opacity: 0.5, scale: 0.95 }}
                    animate={{ x: 0, opacity: 1, scale: 1 }}
                    exit={{ x: '100%', opacity: 0.5, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className={styles.mobileMenu}
                    onClick={e => e.stopPropagation()}
                  >
                    <div className={styles.mobileMenuHeader}>
                      <span className={styles.mobileMenuTitle}>Чаты</span>
                      <button className={styles.mobileMenuCloseBtn} onClick={() => setMobileMenuOpen(false)} title="Закрыть меню">
                        <FiX size={28} />
                      </button>
                    </div>
                    <div className={styles.chatsList}>
                      <div className={styles.chatsHistoryTitle}>{t('chatHistory')}</div>
                      {chats.length === 0 && (
                        <div className={styles.emptyChats}><FiMessageSquare /> {t('noChats')}</div>
                      )}
                      {chats.map((chat) => (
                        <div
                          key={chat.id}
                          className={chat.id === currentChatId ? styles.chatItemActive : styles.chatItem}
                          onClick={() => { selectChat(chat.id); setMobileMenuOpen(false); }}
                        >
                          <span className={styles.chatTitle}
                            style={{ color: chatThemeLight ? '#23232a' : '#fff' }}
                          >
                            <FiMessageSquare style={{marginRight: 6}} />{chat.title}</span>
                        <div className={styles.chatActions}>
                          <button
                            className={styles.shareChatBtn}
                            onClick={(e) => { e.stopPropagation(); setShowShareModal(true); }}
                            title="Поделиться чатом"
                          >
                            <FiShare2 />
                          </button>
                          <button
                            className={styles.deleteChatBtn}
                            onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
                            title={t('deleteChat')}
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className={styles.newChatBox}>
                    <input
                      type="text"
                      placeholder={t('chatTitle')}
                      value={newChatTitle}
                      onChange={(e) => setNewChatTitle(e.target.value)}
                      className={styles.newChatInput}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleCreateChat(); }}
                    />
                    <button className={styles.newChatBtn} onClick={handleCreateChat} title={t('newChat')}>
                      <FiPlus />
                    </button>
                  </div>
                  <div className={styles.sidebarFooter}>
                    <div className={styles.userInfoSidebar}>
                      <span className={styles.avatarSidebar}><FiUser /></span>
                      <span className={styles.userNameSidebar}>{user?.name || t('user')}</span>
                    </div>
                    <button className={styles.logoutSidebar} onClick={logout} title={t('logout')}>
                      <FiLogOut />
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          )}
        </>
        )}

        {/* Main Chat Area */}
        <main className={styles.chatContainer}>
          <div className={styles.messagesContainer}>
            {!currentChat || currentChat.messages.length === 0 ? (
              <div className={styles.welcomeMessage}>
                <div className={styles.welcomeIcon}><AnimatedBotBall size={64} /></div>
                <h2>{t('welcome')}</h2>
                <p>{t('welcomeSubtitle')}</p>
              </div>
            ) : (
              currentChat.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`${styles.message} ${msg.role === "user" ? styles.userMessage : styles.aiMessage}`}
                  style={{ alignItems: 'flex-start' }}
                >
                  {/* Иконка только для бота, сверху */}
                  {msg.role === "assistant" && (
                    <div className={styles.messageAvatar}>
                      <AnimatedBotBall size={40} />
                    </div>
                  )}
                  <div className={styles.messageContent}>
                    {/* Если это AI-сообщение с reasoning/answer — кастомный рендер */}
                    {msg.role === 'assistant' && msg.reasoning ? (
                      <div
                        className={styles.aiReasoningBlock}
                        style={{
                          background: chatThemeLight ? '#fff' : '#18181a',
                          color: chatThemeLight ? '#23232a' : '#fff'
                        }}
                      >
                        <div className={styles.reasoningHeader}>
                          <span className={styles.reasoningTitle}>
                            <FiZap className={styles.reasoningIcon} />
                            {collapsedReasoning[msg.id] ? t('reasoningCollapsed') : t('reasoning')}
                          </span>
                          <button className={styles.collapseBtn} onClick={() => setCollapsedReasoning(prev => ({ ...prev, [msg.id]: !prev[msg.id] }))} title={collapsedReasoning[msg.id] ? t('expandReasoning') : t('collapseReasoning')}>
                            {collapsedReasoning[msg.id] ? <FiPlus /> : <FiX />}
                          </button>
                        </div>
                        {/* Reasoning (мышление) — только если не свернуто */}
                        {!collapsedReasoning[msg.id] && msg.reasoning && (
                          <div
                            className={styles.reasoningText}
                            style={{
                              background: chatThemeLight ? '#fff' : '#18191f',
                              color: chatThemeLight ? '#23232a' : '#ffb74d',
                              borderRadius: 8,
                              padding: '7px 10px',
                              marginBottom: 6,
                              fontFamily: `'JetBrains Mono', 'Fira Mono', 'Consolas', monospace`,
                              fontSize: '0.97em',
                              whiteSpace: 'pre-line',
                              animation: 'fadeIn 0.5s'
                            }}
                          >
                            <MessageRenderer content={msg.reasoning} themeLight={chatThemeLight} />
                          </div>
                        )}
                        {/* Кнопки снизу reasoning */}
                        <div style={{display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8}}>
                          <button className={styles.copyBtn} onClick={() => navigator.clipboard.writeText(msg.reasoning || '')} title="Скопировать reasoning"><FiCopy /></button>
                          <button className={styles.regenBtn} onClick={() => handleRegenerate(msg)} title="Перегенерировать reasoning"><FiRefreshCw /></button>
                        </div>
                        {/* Финальный ответ — всегда показывать, даже если reasoning свернут */}
                        {msg.answer ? (
                          <div className={styles.answerText}>
                            <div className={styles.answerHeader}>
                              <span className={styles.answerTitle}>{t('finalAnswer')}</span>
                            </div>
                            <MessageRenderer content={msg.answer} themeLight={chatThemeLight} role="assistant" />
                            {/* Кнопки снизу финального ответа */}
                            <div style={{display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8}}>
                              <button className={styles.copyBtn} onClick={() => navigator.clipboard.writeText(msg.answer || '')} title="Скопировать ответ"><FiCopy /></button>
                              <button className={styles.regenBtn} onClick={() => handleRegenerate(msg)} title="Перегенерировать ответ"><FiRefreshCw /></button>
                            </div>
                            {/* Кнопки ссылок, если есть searchSources */}
                            {Array.isArray(msg.searchSources) && msg.searchSources.length > 0 && (
                              <div style={{marginTop: 14, display: 'flex', gap: 8, flexWrap: 'nowrap', alignItems: 'center', overflowX: 'auto'}}>
                                {msg.searchSources.slice(0, 4).map((source, idx) => {
                                  const processedSource = typeof source === 'string' ? {
                                    title: (() => { try { return new URL(source).hostname; } catch { return source; } })(),
                                    url: source,
                                    favicon: (() => { try { return `https://www.google.com/s2/favicons?domain=${new URL(source).hostname}`; } catch { return ''; } })(),
                                  } : source;
                                  return processedSource ? (
                                    <SourceCard key={idx} source={processedSource} />
                                  ) : null;
                                })}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className={styles.answerText}>
                            <div className={styles.answerHeader}>
                              <span className={styles.answerTitle}>{t('finalAnswer')}</span>
                            </div>
                            <div style={{color: '#ffb74d', opacity: 0.8, fontStyle: 'italic', fontSize: '1em', padding: '8px 0'}}>
                              Нет финального ответа
                            </div>
                          </div>
                        )}
                        <div className={styles.messageTime}>{formatTime(msg.timestamp)}</div>
                      </div>
                    ) : (
                      <>
                        <div className={styles.messageText}>
                          {msg.role === 'user' && (msg.fileName || msg.fileSize || msg.fileType) && (
                            <div className={styles.fileMessage}>
                              <FiUpload className={styles.fileMessageIcon} />
                              <span className={styles.fileName}>{shortenFileName(msg.fileName)}</span>
                              {msg.fileType && <span className={styles.fileType}>{msg.fileType}</span>}
                              {msg.fileSize && <span className={styles.fileSize}>{(msg.fileSize / 1024).toFixed(2)} KB</span>}
                            </div>
                          )}
                          <MessageRenderer content={msg.role === 'assistant' && msg.answer ? msg.answer : msg.content} themeLight={chatThemeLight} role={msg.role} />
                        </div>
                        {/* Кнопки ссылок для обычных сообщений AI */}
                        {msg.role === 'assistant' && Array.isArray(msg.searchSources) && msg.searchSources.length > 0 && (
                          (() => {
                            const isMobile = typeof window !== 'undefined' && window.innerWidth <= 480;
                            return isMobile ? (
                              <div style={{
                                marginTop: 14,
                                display: 'flex',
                                flexDirection: 'row',
                                overflowX: 'auto',
                                gap: 8,
                                width: '100%',
                                paddingBottom: 4,
                              }}>
                                {msg.searchSources.slice(0, 4).map((source, idx) => {
                                  const processedSource = typeof source === 'string' ? {
                                    title: (() => { try { return new URL(source).hostname; } catch { return source; } })(),
                                    url: source,
                                    favicon: (() => { try { return `https://www.google.com/s2/favicons?domain=${new URL(source).hostname}`; } catch { return ''; } })(),
                                  } : source;
                                  return processedSource ? (
                                    <SourceCard key={idx} source={processedSource} />
                                  ) : null;
                                })}
                              </div>
                            ) : (
                              <div style={{
                                marginTop: 14,
                                display: 'flex',
                                flexDirection: 'row',
                                gap: 16,
                                width: '100%',
                                maxWidth: 740,
                                justifyContent: 'flex-start',
                                alignItems: 'stretch',
                                flexWrap: 'nowrap',
                                overflowX: 'auto',
                              }}>
                                {msg.searchSources.slice(0, 4).map((source, idx) => {
                                  const processedSource = typeof source === 'string' ? {
                                    title: (() => { try { return new URL(source).hostname; } catch { return source; } })(),
                                    url: source,
                                    favicon: (() => { try { return `https://www.google.com/s2/favicons?domain=${new URL(source).hostname}`; } catch { return ''; } })(),
                                  } : source;
                                  return processedSource ? (
                                    <SourceCard key={idx} source={processedSource} />
                                  ) : null;
                                })}
                              </div>
                            );
                          })()
                        )}
                        {msg.role === 'assistant' && !msg.reasoning && msg.id === lastAssistantId && (
                          <div style={{display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 2}}>
                            <button className={styles.copyBtn} onClick={() => navigator.clipboard.writeText(msg.answer || msg.content || '')} title="Скопировать ответ"><FiCopy /></button>
                            <button className={styles.regenBtn} onClick={async () => {
                              if (isLoading || isThinking || !currentChat) return;
                              // Найти последнее сообщение пользователя перед этим AI-ответом
                              const idx = currentChat.messages.findIndex(m => m.id === msg.id);
                              if (idx === -1) return;
                              let userMsg = null;
                              for (let i = idx - 1; i >= 0; i--) {
                                if (currentChat.messages[i].role === 'user') {
                                  userMsg = currentChat.messages[i];
                                  break;
                                }
                              }
                              if (!userMsg || !userMsg.content) return;
                              // Удалить это AI-сообщение
                              const chatId = currentChat.id;
                              useChatStore.getState().deleteMessage(chatId, msg.id);
                              setIsThinking(true);
                              try {
                                await sendMessage(userMsg.content, language, apiKey);
                              } finally {
                                setIsThinking(false);
                              }
                            }} title="Перегенерировать ответ"><FiRefreshCw /></button>
                          </div>
                        )}
                        <div className={styles.messageTime}>{formatTime(msg.timestamp)}</div>
                      </>
                    )}
                  </div>
                  {/* У пользователя иконки нет */}
                </div>
              ))
            )}

            {isThinking || isLoading ? (
              <div className={`${styles.message} ${styles.aiMessage}`}>
                <div className={styles.messageAvatar}>
                  <AnimatedBotBall size={40} />
                </div>
                <div className={styles.messageContent}>
                  <ProgressStage isThinking={isThinking} chunkProgress={chunkProgress} isLoading={isLoading} reasoningEnabled={currentChat?.reasoningEnabled} webSearchEnabled={currentChat?.webSearchEnabled} />
                </div>
              </div>
            ) : null}

            {isThinking && chunkProgress && (
              <div style={{textAlign: 'center', color: '#f59e42', fontWeight: 600, margin: '16px 0'}}>
                {chunkProgress.stage}: {chunkProgress.current} из {chunkProgress.total}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {error && (
            <div className={styles.errorMessage}>
              <span>{error}</span>
              <button onClick={clearError} className={styles.errorCloмse}>
                ×
              </button>
            </div>
          )}

          {/* Input-бар */}
          {isMobile && (
            <div
              className={styles.mobileActions}
              style={{
                background: chatThemeLight ? '#fff7ed' : '#23232a',
                borderRadius: 12,
                boxShadow: chatThemeLight
                  ? '0 2px 8px rgba(245, 158, 66, 0.08)'
                  : '0 2px 12px rgba(0,0,0,0.10)',
                margin: '0 0 12px 0',
                padding: '8px 8px 8px 8px',
                transition: 'background 0.28s cubic-bezier(0.4,0,0.2,1), box-shadow 0.28s cubic-bezier(0.4,0,0.2,1)',
              }}
            >
              {[
                { key: 'reason', onClick: handleToggleReasoning, icon: <FiZap size={20} />, label: t('deepThink'), active: currentChat?.reasoningEnabled },
                { key: 'web', onClick: handleToggleWebSearch, icon: <FiSearch size={20} />, label: t('webSearch'), active: currentChat?.webSearchEnabled },
                { key: 'settings', onClick: () => setShowSettings(true), icon: <FiSettings size={20} />, label: t('settings'), active: false },
              ].map(btn => {
                // Определяем стили для светлой и тёмной темы
                const isLight = chatThemeLight;
                const isHovered = mobileBtnHover === btn.key;
                const isPressed = mobileBtnActive === btn.key;
                let bg = isLight ? '#fff7ed' : '#23232a';
                let color = isLight ? '#f59e42' : '#f59e42';
                let border = '1.5px solid #f59e42';
                if (isHovered || isPressed || btn.active) {
                  bg = '#f59e42';
                  color = '#fff';
                  border = '1.5px solid #f59e42';
                }
                return (
                  <button
                    key={btn.key}
                    type="button"
                    className={styles.controlBtn}
                    onClick={btn.onClick}
                    disabled={!currentChat && btn.key !== 'settings'}
                    title={btn.label}
                    style={{
                      background: bg,
                      color,
                      border,
                      boxShadow: isHovered || isPressed ? '0 4px 16px rgba(245,158,66,0.18)' : '0 2px 8px rgba(245,158,66,0.08)',
                      transform: isPressed ? 'scale(0.93)' : isHovered ? 'scale(1.04)' : 'none',
                      transition: 'background 0.28s cubic-bezier(0.4,0,0.2,1), color 0.28s cubic-bezier(0.4,0,0.2,1), border 0.28s cubic-bezier(0.4,0,0.2,1), box-shadow 0.28s cubic-bezier(0.4,0,0.2,1), transform 0.18s cubic-bezier(0.4,0,0.2,1)',
                      fontWeight: 500,
                    }}
                    onMouseEnter={() => setMobileBtnHover(btn.key)}
                    onMouseLeave={() => { setMobileBtnHover(null); setMobileBtnActive(null); }}
                    onMouseDown={() => setMobileBtnActive(btn.key)}
                    onMouseUp={() => setMobileBtnActive(null)}
                  >
                    {btn.icon}
                    <span style={{ marginLeft: 6 }}>{btn.label}</span>
                  </button>
                );
              })}
            </div>
          )}
          <form onSubmit={handleSubmit} className={styles.chatInputBar}>
            {/* Файл (чип) */}
            {uploadedFile && (
              <span className={styles.fileChipWrapper}>
                <span className={styles.fileChip}>
                  <FiUpload className={styles.fileChipIcon} />
                  <span className={styles.fileName}>{uploadedFile.name}</span>
                  <button type="button" className={styles.fileChipRemove} onClick={handleRemoveFile} title={t('fileRemove')}>
                    <FiX />
                  </button>
                </span>
              </span>
            )}
            <div className={styles.inputRow}>
              <textarea
                className={styles.inputBarInput}
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={uploadedFile ? `Введите вопрос о файле \"${uploadedFile.name}\"...` : (currentChat && models.find(m => m.id === currentChat.modelId)?.name ? `${t('message')} ${models.find(m => m.id === currentChat.modelId)?.name}` : t('messagePlaceholder'))}
                disabled={isLoading || isThinking || !currentChatId}
                rows={1}
                style={{
                  resize: 'none',
                  overflow: 'hidden',
                  minHeight: isMobile ? 40 : 44,
                  maxHeight: isMobile ? 90 : 120,
                  fontSize: isMobile ? '1.05rem' : '1.13rem',
                  padding: isMobile ? '12px 10px' : '18px 28px',
                  textAlign: 'center'
                }}
                onInput={e => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = Math.min(target.scrollHeight, isMobile ? 90 : 120) + 'px';
                }}
              />
              {/* Upload внутри input-bar */}
              <button
                type="button"
                className={styles.uploadBtn}
                onClick={() => { if (!currentChat?.webSearchEnabled) setShowUploadDropdown(true); }}
                disabled={fileLoading || isLoading || currentChat?.webSearchEnabled}
                title={currentChat?.webSearchEnabled ? t('uploadDisabled') : t('uploadFile')}
                style={{marginLeft: 4, marginRight: 4}}
              >
                <FiUpload size={20} />
              </button>
              {/* Send */}
              <button
                type="submit"
                className={styles.sendBtn}
                disabled={(!message.trim() && !uploadedFile) || isLoading || isThinking || !currentChatId}
                title={t('send')}
              >
                <FiSend />
              </button>
            </div>
          </form>

          {/* Кнопки под input в form */}
          {!isMobile && (
            <div className={styles.bottomControls}>
              <div className={styles.leftControls}>
                {/* DeepThink (мышление) */}
                <button
                  type="button"
                  className={styles.controlBtn + (currentChat?.reasoningEnabled ? ' ' + styles.controlBtnActive : '')}
                  onClick={handleToggleReasoning}
                  disabled={!currentChat}
                  title={t('deepThinkTooltip')}
                >
                  <FiZap size={18} />
                  <span>{t('deepThink')}</span>
                </button>
                {/* Веб-поиск */}
                <button
                  type="button"
                  className={styles.controlBtn + (currentChat?.webSearchEnabled ? ' ' + styles.controlBtnActive : '')}
                  onClick={handleToggleWebSearch}
                  disabled={!currentChat}
                  title={t('webSearchTooltip')}
                >
                  <FiSearch size={18} />
                  <span>{t('webSearch')}</span>
                </button>
                {/* Выбор модели */}
                <div className={styles.modelSelector}>
                  <AnimatedBotBall size={24} />
                  <select
                    className={styles.modelSelect}
                    value={currentChat?.modelId || ''}
                    onChange={e => handleModelChange(e.target.value)}
                    disabled={!currentChat}
                  >
                    {models.map((model) => (
                      <option key={model.id} value={model.id}>{model.name}</option>
                    ))}
                  </select>
                </div>

              </div>
              <div className={styles.rightControls}>
                {/* Настройки */}
                <button
                  type="button"
                  className={styles.controlBtn}
                  onClick={() => setShowSettings(true)}
                  title={t('settings')}
                >
                  <FiSettings size={18} />
                </button>
                {/* Поделиться */}
                <button
                  type="button"
                  className={styles.controlBtn}
                  onClick={() => setShowShareModal(true)}
                  title="Поделиться"
                >
                  <FiShare2 size={18} />
                </button>
              </div>
            </div>
          )}

          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".txt,.json,.pdf,image/*"
            onChange={handleFileInputChange}
            disabled={fileLoading || isLoading || currentChat?.webSearchEnabled}
          />
        </main>

        {/* Settings Modal */}
        <SettingsModal
          open={showSettings}
          onClose={() => setShowSettings(false)}
        />

        {/* Upload Dropdown */}
        <UploadDropdown
          isOpen={showUploadDropdown}
          onClose={() => setShowUploadDropdown(false)}
          onFileUpload={handleFileUpload}
          onImageUpload={handleImageUpload}
          onYouTubeUpload={handleYouTubeUpload}
          onUrlExtract={async (url: string) => {
            setFileLoading(true);
            try {
              const response = await fetch('/api/url-extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
              });
              const contentType = response.headers.get('content-type');
              if (!response.ok) {
                // Пробуем получить текст ошибки
                const errorText = contentType && contentType.includes('application/json')
                  ? (await response.json()).error
                  : await response.text();
                throw new Error(errorText || 'Ошибка извлечения текста');
              }
              if (contentType && contentType.includes('application/json')) {
              const data = await response.json();
                // Вместо handleLargeText — создаём виртуальный файл
                const siteFile = new File([data.text], "site.txt", { type: "text/plain" });
                setUploadedFile(siteFile);
              } else {
                const text = await response.text();
                throw new Error('Сервер вернул не JSON: ' + text);
              }
            } catch (err) {
              alert('Ошибка при извлечении текста с сайта: ' + (err instanceof Error ? err.message : err));
            } finally {
              setFileLoading(false);
            }
          }}
        />

        {/* Share Modal */}
        <ShareModal
          open={showShareModal}
          onClose={() => setShowShareModal(false)}
          chatId={currentChatId || ''}
          chatTitle={currentChat?.title || 'Новый чат'}
        />
      </div>
    </>
  );
}

// Простой Typewriter-компонент
function Typewriter({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState('');
  
  useEffect(() => {
    setDisplayed('');
    if (!text) return;
    
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed((prev) => prev + text[i]);
      i++;
      if (i >= text.length) {
        clearInterval(interval);
      }
    }, 12);
    
    return () => clearInterval(interval);
  }, [text]);
  
  return <span>{displayed}</span>;
} 