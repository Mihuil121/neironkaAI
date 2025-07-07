'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useChatStore, Chat } from '@/store/useChatStore';
import { useAuthStore } from '@/store/useAuthStore';
import ChatInterface from '@/components/ChatInterface';
import styles from './page.module.scss';
import { FiArrowLeft, FiMessageSquare } from 'react-icons/fi';
import Link from 'next/link';

export default function SharedChatPage() {
  const params = useParams();
  const chatId = params.id as string;
  const { chats, selectChat } = useChatStore();
  const { isAuthenticated } = useAuthStore();
  const [chat, setChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (chatId) {
      // Ищем чат в локальном store
      const foundChat = chats.find(c => c.id === chatId);
      
      if (foundChat) {
        setChat(foundChat);
        selectChat(chatId);
        setLoading(false);
      } else {
        // Если чат не найден в локальном store, возможно нужно загрузить из API
        // Пока что показываем ошибку
        setError('Чат не найден');
        setLoading(false);
      }
    }
  }, [chatId, chats, selectChat]);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Загрузка чата...</p>
      </div>
    );
  }

  if (error || !chat) {
    return (
      <div className={styles.errorContainer}>
        <FiMessageSquare className={styles.errorIcon} />
        <h2>Чат не найден</h2>
        <p>Возможно, ссылка устарела или чат был удален.</p>
        <Link href="/" className={styles.backButton}>
          <FiArrowLeft />
          Вернуться на главную
        </Link>
      </div>
    );
  }

  // Если пользователь не авторизован, показываем приглашение
  if (!isAuthenticated) {
    return (
      <div className={styles.guestContainer}>
        <div className={styles.guestContent}>
          <FiMessageSquare className={styles.guestIcon} />
          <h2>Присоединяйтесь к чату</h2>
          <p>Для продолжения этого чата необходимо войти в систему</p>
          <div className={styles.guestActions}>
            <Link href="/" className={styles.loginButton}>
              Войти в систему
            </Link>
            <Link href="/" className={styles.backButton}>
              <FiArrowLeft />
              На главную
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Если все хорошо, показываем обычный интерфейс чата
  return <ChatInterface />;
} 