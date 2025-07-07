'use client';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import AuthModal from '@/components/AuthModal';
import ChatInterface from '@/components/ChatInterface';
import styles from './page.module.scss';

export default function Home() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    // Если пользователь не авторизован, показываем модальное окно
    if (!isAuthenticated) {
      setShowAuthModal(true);
    }
  }, [isAuthenticated]);

  if (isAuthenticated) {
    return <ChatInterface />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.backgroundElements}>
        <div className={styles.networkIcon}></div>
        <div className={styles.floatingOrbs}>
          <div className={styles.orb}></div>
          <div className={styles.orb}></div>
          <div className={styles.orb}></div>
        </div>
      </div>
      
      <div className={styles.hero}>
        <div className={styles.logo}>
          <div className={styles.iconContainer}>
            <span className={styles.foxIcon}>🦊</span>
          </div>
          <h1>
            Neironka 
           
          </h1>
          <span className={styles.betaBadge}>Бета</span>
        </div>
        
        <div className={styles.content}>
          <h2>Ваш универсальный AI-компаньон нового поколения</h2>
          <p>
            Neironka — это современный искусственный интеллект для общения, поиска, генерации идей и автоматизации задач. Проект находится в активной разработке.
          </p>
          
          <div className={styles.features}>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>💬</div>
              <h3>Чат с AI</h3>
              <p>Общение на любые темы, помощь с вопросами, генерация текстов, идей и советов.</p>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>🌐</div>
              <h3>AI-поиск</h3>
              <p>ИИ сам находит и анализирует информацию из интернета, чтобы дать вам актуальный и точный ответ.</p>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>🛡️</div>
              <h3>Защита и приватность</h3>
              <p>Ограничения по длине сообщений, антиспам, лимиты по IP, защита от злоупотреблений.</p>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>⚡</div>
              <h3>Быстрота</h3>
              <p>Мгновенные ответы и минимальные задержки даже при высокой нагрузке.</p>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>📄</div>
              <h3>Работа с текстами и файлами</h3>
              <p>Загрузка документов, анализ, извлечение информации, поддержка медиа и YouTube-видео.</p>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>🔒</div>
              <h3>Безопасность</h3>
              <p>Данные пользователей защищены современными методами шифрования.</p>
            </div>
          </div>
          
          <div className={styles.betaNotice}>
            <div className={styles.warningIcon}>⚠️</div>
            <span>Проект находится в стадии бета-тестирования. Возможны ошибки и нестабильная работа.</span>
          </div>
          
          <button
            className={styles.startButton}
            onClick={() => setShowAuthModal(true)}
          >
            <span>Начать общение</span>
            <div className={styles.buttonArrow}>→</div>
          </button>
        </div>
      </div>
      
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
}