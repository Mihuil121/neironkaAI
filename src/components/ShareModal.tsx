'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import styles from './ShareModal.module.scss';
import { FiX, FiCopy, FiDownload, FiShare2 } from 'react-icons/fi';
import ShareModalHeader from './ShareModalHeader';
import ShareModalContent from './ShareModalContent';

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  chatId: string;
  chatTitle: string;
  chatMessages?: any[];
}

export default function ShareModal({ open, onClose, chatId, chatTitle, chatMessages = [] }: ShareModalProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const { user } = useAuthStore();
  
  // Создаем ссылку с историей чата
  const createShareUrl = () => {
    if (typeof window === 'undefined' || !chatMessages || chatMessages.length === 0) {
      return `${window.location.origin}/chat/${chatId}`;
    }
    
    try {
      // Создаем короткий ID для ссылки
      const shareId = btoa(chatId + Date.now()).replace(/[^a-zA-Z0-9]/g, '').substring(0, 8);
      
      // Сохраняем данные чата в localStorage для быстрого доступа
      const chatData = {
        title: chatTitle,
        messages: chatMessages,
        timestamp: Date.now()
      };
      
      // Сохраняем в localStorage с ключом shareId
      if (typeof window !== 'undefined') {
        localStorage.setItem(`chat_share_${shareId}`, JSON.stringify(chatData));
        
        // Очищаем старые данные через 24 часа
        setTimeout(() => {
          localStorage.removeItem(`chat_share_${shareId}`);
        }, 24 * 60 * 60 * 1000);
      }
      
      console.log('Создаем короткую ссылку для чата:', shareId);
      
      const shareUrl = `${window.location.origin}/chat/import?share=${shareId}`;
      console.log('Финальная ссылка:', shareUrl);
      
      return shareUrl;
    } catch (error) {
      console.error('Ошибка при создании ссылки:', error);
      return `${window.location.origin}/chat/${chatId}`;
    }
  };
  
  const shareUrl = createShareUrl();

  useEffect(() => {
    if (open && shareUrl) {
      // Генерируем QR код используя API
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`;
      setQrCodeUrl(qrApiUrl);
    }
  }, [open, shareUrl]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback для старых браузеров
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadQR = () => {
    if (qrCodeUrl) {
      const link = document.createElement('a');
      link.href = qrCodeUrl;
      link.download = `chat-${chatId}-qr.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Чат: ${chatTitle}`,
          text: `Присоединяйтесь к чату "${chatTitle}" в Fox AI`,
          url: shareUrl,
        });
      } catch (err) {
        // Пользователь отменил шаринг
      }
    } else {
      // Fallback - копируем ссылку
      handleCopyLink();
    }
  };

  if (!open) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <ShareModalHeader onClose={onClose} />
        <ShareModalContent 
          shareUrl={shareUrl}
          chatTitle={chatTitle}
          onCopyLink={handleCopyLink}
          onDownloadQR={handleDownloadQR}
          onShare={handleShare}
          copied={copied}
        />
      </div>
    </div>
  );
} 