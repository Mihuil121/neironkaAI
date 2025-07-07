'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import styles from './ShareModal.module.scss';
import { FiX, FiCopy, FiDownload, FiShare2 } from 'react-icons/fi';

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  chatId: string;
  chatTitle: string;
}

export default function ShareModal({ open, onClose, chatId, chatTitle }: ShareModalProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const { user } = useAuthStore();
  
  const shareUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/chat/${chatId}` 
    : '';

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
        <button className={styles.closeBtn} onClick={onClose} title="Закрыть">
          <FiX />
        </button>
        <div className={styles.header}>
          <h2>Поделиться чатом</h2>
        </div>
        <div style={{color: '#f59e42', fontWeight: 700, textAlign: 'center', margin: '40px 0', fontSize: '1.2em'}}>
          Пока что функция шаринга чата недоступна.
        </div>
      </div>
    </div>
  );
} 