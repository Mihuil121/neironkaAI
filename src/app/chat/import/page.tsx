'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useChatStore } from '@/store/useChatStore';
import { useAuthStore } from '@/store/useAuthStore';

export default function ImportChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { createChat, importChatMessages, currentChatId } = useChatStore();
  const { isAuthenticated } = useAuthStore();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    const shareId = searchParams.get('share');
    const data = searchParams.get('data'); // Для обратной совместимости
    
    if (!shareId && !data) {
      setError('Неверная ссылка для импорта чата');
      setStatus('error');
      return;
    }

    if (!isAuthenticated) {
      // Если пользователь не авторизован, перенаправляем на главную
      router.replace('/');
      return;
    }

    try {
      console.log('Начинаем импорт чата...');
      
      let chatData: any;
      
      if (shareId) {
        // Новая система с короткими ссылками
        console.log('Используем короткую ссылку:', shareId);
        
        if (typeof window === 'undefined') {
          throw new Error('localStorage недоступен');
        }
        
        const storedData = localStorage.getItem(`chat_share_${shareId}`);
        if (!storedData) {
          throw new Error('Данные чата не найдены или устарели');
        }
        
        chatData = JSON.parse(storedData);
        console.log('Полученные данные из localStorage:', chatData);
      } else if (data) {
        // Старая система с длинными ссылками (для обратной совместимости)
        console.log('Используем старую ссылку:', data);
        
        const decodedData = decodeURIComponent(escape(atob(data)));
        console.log('Декодированные данные:', decodedData);
        
        chatData = JSON.parse(decodedData);
        console.log('Парсинг JSON:', chatData);
      }
      
      // Проверяем структуру данных
      if (!chatData.title || !Array.isArray(chatData.messages)) {
        throw new Error('Неверный формат данных чата');
      }

      // Создаем новый чат с импортированной историей
      createChat(chatData.title);
      
      // Ждем немного, чтобы currentChatId обновился
      setTimeout(() => {
        const newChatId = currentChatId;
        if (newChatId) {
          importChatMessages(newChatId, chatData.messages);
          router.replace(`/chat/${newChatId}`);
        } else {
          // Если currentChatId все еще null, создаем чат вручную
          const manualChatId = Date.now().toString();
          importChatMessages(manualChatId, chatData.messages);
          router.replace(`/chat/${manualChatId}`);
        }
      }, 100);

      setStatus('success');
    } catch (err) {
      console.error('Ошибка при импорте чата:', err);
      setError('Ошибка при импорте чата. Проверьте ссылку.');
      setStatus('error');
    }
  }, [searchParams, isAuthenticated, createChat, importChatMessages, currentChatId, router]);

  if (status === 'loading') {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#1a1a1a',
        color: '#fff'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '3px solid #f59e42', 
            borderTop: '3px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }} />
          <p>Импортируем чат...</p>
        </div>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#1a1a1a',
        color: '#fff'
      }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <h2 style={{ color: '#f59e42', marginBottom: '20px' }}>Ошибка импорта</h2>
          <p style={{ marginBottom: '20px', opacity: 0.8 }}>{error}</p>
          <button
            onClick={() => router.push('/')}
            style={{
              background: '#f59e42',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '10px 20px',
              cursor: 'pointer',
              fontSize: '1em'
            }}
          >
            Вернуться на главную
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: '#1a1a1a',
      color: '#fff'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ color: '#4CAF50', marginBottom: '20px' }}>Чат успешно импортирован!</h2>
        <p style={{ opacity: 0.8 }}>Перенаправляем вас к чату...</p>
      </div>
    </div>
  );
} 