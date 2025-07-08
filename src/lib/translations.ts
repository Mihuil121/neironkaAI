export const translations = {
  ru: {
    // Общие
    welcome: 'Добро пожаловать в Neironka Ai!',
    welcomeSubtitle: 'Я ваш AI помощник. Задавайте мне любые вопросы, и я постараюсь помочь!',
    online: 'Онлайн',
    user: 'Пользователь',
    send: 'Отправить',
    cancel: 'Отмена',
    close: 'Закрыть',
    save: 'Сохранить',
    delete: 'Удалить',
    edit: 'Редактировать',
    loading: 'Загрузка...',
    error: 'Ошибка',
    success: 'Успешно',

    // Навигация
    newChat: 'Новый чат',
    chatTitle: 'Название чата',
    noChats: 'Нет чатов',
    deleteChat: 'Удалить чат',
    logout: 'Выйти',

    // Чат
    message: 'Сообщение',
    messagePlaceholder: 'Введите сообщение...',
    thinking: 'Думаю...',
    reasoning: 'Reasoning',
    reasoningCollapsed: 'Reasoning (свернуто)',
    finalAnswer: '🎯 Финальный ответ:',
    expandReasoning: 'Развернуть reasoning',
    collapseReasoning: 'Свернуть reasoning',

    // Кнопки
    deepThink: 'Думать',
    deepThinkTooltip: 'Включить глубокое мышление',
    selectModel: 'Выбрать модель',
    uploadFile: 'Загрузить',
    uploadDisabled: 'Загрузка файлов недоступна при включённом веб-поиске',
    uploadContent: 'Загрузить контент',
    file: 'Файл',
    fileDesc: 'PDF, TXT, JSON и другие',
    image: 'Изображение',
    imageDesc: 'JPG, PNG, GIF и другие',
    youtubeVideo: 'YouTube видео',
    youtubeDesc: 'Извлечь транскрипт',
    youtubePlaceholder: 'Вставьте ссылку на YouTube видео...',
    upload: 'Загрузить',
    siteUrl: 'Сайт (URL)',
    siteDesc: 'Извлечь текст с веб-страницы',
    sitePlaceholder: 'Вставьте ссылку на сайт...',
    settings: 'Настройки',
    settingsTooltip: 'Настройки',

    // Модели
    model: 'Модель',
    cypherAlpha: 'Cypher Alpha',
    deepSeek: 'DeepSeek: R1',
    qwen3: 'Qwen3',

    // Настройки
    settingsTitle: 'Настройки',
    interfaceLanguage: 'Язык интерфейса:',
    theme: 'Тема:',
    darkTheme: 'Тёмная',
    lightTheme: 'Светлая',
    russian: 'Русский',
    english: 'English',

    // Аутентификация
    login: 'Войти',
    register: 'Регистрация',
    email: 'Email',
    password: 'Пароль',
    name: 'Имя',
    adminCode: 'Код администратора (опционально)',
    loginError: 'Ошибка входа',
    registerError: 'Ошибка регистрации',
    messageRequired: 'Сообщение обязательно',
    requestError: 'Ошибка при обработке запроса',

    // Файлы
    fileUpload: 'Загрузить файл',
    fileRemove: 'Удалить файл',
    fileFormatError: 'Формат файла не поддерживается.',
    fileExtractionError: 'Ошибка извлечения текста из файла',
  },

  en: {
    // General
    welcome: 'Welcome to Neironka Ai!',
    welcomeSubtitle: 'I am your AI assistant. Ask me any questions and I will try to help!',
    online: 'Online',
    user: 'User',
    send: 'Send',
    cancel: 'Cancel',
    close: 'Close',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',

    // Navigation
    newChat: 'New Chat',
    chatTitle: 'Chat Title',
    noChats: 'No chats',
    deleteChat: 'Delete Chat',
    logout: 'Logout',

    // Chat
    message: 'Message',
    messagePlaceholder: 'Type a message...',
    thinking: 'Thinking...',
    reasoning: 'Reasoning',
    reasoningCollapsed: 'Reasoning (collapsed)',
    finalAnswer: '🎯 Final Answer:',
    expandReasoning: 'Expand reasoning',
    collapseReasoning: 'Collapse reasoning',

    // Buttons
    deepThink: 'DeepThink',
    deepThinkTooltip: 'Enable deep reasoning',
    selectModel: 'Select model',
    uploadFile: 'Upload',
    uploadDisabled: 'File upload is unavailable when web search is enabled',
    uploadContent: 'Upload content',
    file: 'File',
    fileDesc: 'PDF, TXT, JSON and others',
    image: 'Image',
    imageDesc: 'JPG, PNG, GIF and others',
    youtubeVideo: 'YouTube video',
    youtubeDesc: 'Extract transcript',
    youtubePlaceholder: 'Paste YouTube video link...',
    upload: 'Upload',
    siteUrl: 'Site (URL)',
    siteDesc: 'Extract text from web page',
    sitePlaceholder: 'Paste site link...',
    settings: 'Settings',
    settingsTooltip: 'Settings',

    // Models
    model: 'Model',
    cypherAlpha: 'Cypher Alpha',
    deepSeek: 'DeepSeek: R1',
    qwen3: 'Qwen3',

    // Settings
    settingsTitle: 'Settings',
    interfaceLanguage: 'Interface language:',
    theme: 'Theme:',
    darkTheme: 'Dark',
    lightTheme: 'Light',
    russian: 'Русский',
    english: 'English',

    // Authentication
    login: 'Login',
    register: 'Register',
    email: 'Email',
    password: 'Password',
    name: 'Name',
    adminCode: 'Admin code (optional)',
    loginError: 'Login error',
    registerError: 'Registration error',
    messageRequired: 'Message is required',
    requestError: 'Request processing error',

    // Files
    fileUpload: 'Upload file',
    fileRemove: 'Remove file',
    fileFormatError: 'File format is not supported.',
    fileExtractionError: 'Error extracting text from file',
  },
};

import { useAuthStore } from '@/store/useAuthStore';

export type Language = keyof typeof translations;
export type TranslationKeys =
  | 'welcome'
  | 'welcomeSubtitle'
  | 'online'
  | 'user'
  | 'send'
  | 'cancel'
  | 'close'
  | 'save'
  | 'delete'
  | 'edit'
  | 'loading'
  | 'error'
  | 'success'
  | 'newChat'
  | 'chatTitle'
  | 'noChats'
  | 'deleteChat'
  | 'logout'
  | 'login'
  | 'register'
  | 'settings'
  | 'settingsTooltip'
  | 'deepThink'
  | 'deepThinkTooltip'
  | 'webSearch'
  | 'webSearchTooltip'
  | 'uploadFile'
  | 'uploadDisabled'
  | 'uploadContent'
  | 'file'
  | 'fileDesc'
  | 'image'
  | 'imageDesc'
  | 'youtubeVideo'
  | 'youtubeDesc'
  | 'youtubePlaceholder'
  | 'upload'
  | 'siteUrl'
  | 'siteDesc'
  | 'sitePlaceholder'
  | 'fileRemove'
  | 'finalAnswer'
  | 'reasoning'
  | 'reasoningCollapsed'
  | 'expandReasoning'
  | 'collapseReasoning'
  | 'fileExtractionError'
  | 'message'
  | 'messagePlaceholder';

export const useTranslation = () => {
  const { language } = useAuthStore();
  
  const t = (key: TranslationKeys): string => {
    return (translations[language as Language] as any)?.[key] || (translations.ru as any)[key] || key;
  };

  return { t, language };
}; 