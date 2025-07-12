'use client';

import React, { useState, useRef } from 'react';
import { FiUpload, FiImage, FiFile, FiYoutube, FiX } from 'react-icons/fi';
import styles from './UploadDropdown.module.scss';
import { useTranslation } from '@/lib/translations';
import { useChatStore } from '@/store/useChatStore';

interface UploadDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onFileUpload: (file: File) => void;
  onYouTubeUpload: (url: string) => void;
  onImageUpload: (file: File) => void;
  onUrlExtract: (url: string) => void;
}

export default function UploadDropdown({
  isOpen,
  onClose,
  onFileUpload,
  onYouTubeUpload,
  onImageUpload,
  onUrlExtract
}: UploadDropdownProps) {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [showYouTubeInput, setShowYouTubeInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [siteUrl, setSiteUrl] = useState('');
  const { t } = useTranslation();
  const { chatThemeLight } = useChatStore();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
      onClose();
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onImageUpload(file);
      onClose();
    }
  };

  const handleYouTubeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (youtubeUrl.trim()) {
      setIsLoading(true);
      try {
        await onYouTubeUpload(youtubeUrl.trim());
        setYoutubeUrl('');
        setShowYouTubeInput(false);
        onClose();
      } catch (error) {
        // Ошибка уже обработана в ChatInterface
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleUrlExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (siteUrl.trim()) {
      setIsLoading(true);
      try {
        await onUrlExtract(siteUrl.trim());
        setSiteUrl('');
        setShowUrlInput(false);
        onClose();
      } catch (error) {
        // Ошибка уже обработана в ChatInterface
      } finally {
        setIsLoading(false);
      }
    }
  };

  const extractVideoId = (url: string): string | null => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  if (!isOpen) return null;

  // Логика для фона и цвета
  const overlayStyle = {
    background: chatThemeLight ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)'
  };
  const dropdownStyle = {
    background: chatThemeLight ? '#fff' : '#1a1a1e',
    color: chatThemeLight ? '#23232a' : '#fff',
    border: chatThemeLight ? '1px solid #e5e7eb' : '1px solid #23232a',
    boxShadow: chatThemeLight ? '0 8px 32px rgba(0,0,0,0.08)' : '0 8px 32px rgba(0,0,0,0.3)'
  };
  const optionBtnStyle = {
    background: chatThemeLight ? '#f7f7fa' : '#23232a',
    color: '#23232a',
    border: chatThemeLight ? '1px solid #e5e7eb' : '1px solid #23232a',
  };
  const submitBtnStyle = {
    background: chatThemeLight ? 'linear-gradient(135deg, #f59e42 0%, #ff9800 100%)' : 'linear-gradient(135deg, #f59e42 0%, #ff9800 100%)',
    color: '#23232a',
  };
  const cancelBtnStyle = {
    background: chatThemeLight ? '#e5e7eb' : '#374151',
    color: '#23232a',
  };

  // Функция для определения стиля кнопки с учётом disabled
  const getOptionBtnStyle = (disabled = false) => ({
    background: chatThemeLight ? '#fff' : '#23232a',
    color: disabled ? '#bbb' : '#23232a',
    border: chatThemeLight ? '1px solid #e5e7eb' : '1px solid #23232a',
    opacity: 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
  });
  // Функция для цвета иконки
  const getIconColor = (disabled = false) => (disabled ? '#bbb' : '#f59e42');

  return (
    <div className={styles.overlay} style={overlayStyle} onClick={onClose}>
      <div className={styles.dropdown} style={dropdownStyle} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>{t('uploadContent')}</h3>
          <button className={styles.closeBtn} onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className={styles.content}>
          {/* Загрузка файлов */}
          <div className={styles.option}>
            <button
              className={styles.optionBtn}
              style={getOptionBtnStyle(false)}
              onClick={() => fileInputRef.current?.click()}
            >
              <FiFile className={styles.optionIcon} style={{ color: getIconColor(false) }} />
              <div className={styles.optionText}>
                <span className={styles.optionTitle} style={{ color: '#23232a' }}>{t('file')}</span>
                <span className={styles.optionDesc}>{t('fileDesc')}</span>
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.json,.pdf,.doc,.docx,.csv,.md"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </div>

          {/* Загрузка изображений */}
          <div className={styles.option}>
            <button
              className={styles.optionBtn}
              style={getOptionBtnStyle(false)}
              onClick={() => imageInputRef.current?.click()}
            >
              
              <FiImage className={styles.optionIcon} />
              <div className={styles.optionText}>
                <span className={styles.optionTitle} style={{ color: '#23232a' }}>{t('image')}</span>
                <span className={styles.optionDesc}>{t('imageDesc')}</span>
              </div>
            </button>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              style={{ display: 'none' }}
            />
          </div>

          {/* YouTube видео */}
          <div className={styles.option}>
            {!showYouTubeInput ? (
              <button
                className={styles.optionBtn}
                style={optionBtnStyle}
                onClick={() => setShowYouTubeInput(true)}
              >
                <FiYoutube className={styles.optionIcon} />
                <div className={styles.optionText}>
                  <span className={styles.optionTitle} style={{ color: '#23232a' }}>{t('youtubeVideo')}</span>
                  <span className={styles.optionDesc}>{t('youtubeDesc')}</span>
                </div>
              </button>
            ) : (
              <form onSubmit={handleYouTubeSubmit} className={styles.youtubeForm}>
                <div className={styles.youtubeInput}>
                  <input
                    type="url"
                    placeholder={t('youtubePlaceholder')}
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    className={styles.urlInput}
                    autoFocus
                  />
                  <button type="submit" className={styles.submitBtn} disabled={isLoading}
                    style={submitBtnStyle}
                  >
                    {isLoading ? t('loading') : t('upload')}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowYouTubeInput(false)}
                  className={styles.cancelBtn}
                  style={cancelBtnStyle}
                >
                  {t('cancel')}
                </button>
              </form>
            )}
          </div>

          {/* Вставка ссылки на сайт */}
          <div className={styles.option}>
            {!showUrlInput ? (
              <button
                className={styles.optionBtn}
                style={optionBtnStyle}
                onClick={() => setShowUrlInput(true)}
              >
                <FiUpload className={styles.optionIcon} />
                <div className={styles.optionText}>
                  <span className={styles.optionTitle} style={{ color: '#23232a' }}>{t('siteUrl')}</span>
                  <span className={styles.optionDesc}>{t('siteDesc')}</span>
                </div>
              </button>
            ) : (
              <form onSubmit={handleUrlExtract} className={styles.youtubeForm}>
                <div className={styles.youtubeInput}>
                  <input
                    type="url"
                    placeholder={t('sitePlaceholder')}
                    value={siteUrl}
                    onChange={(e) => setSiteUrl(e.target.value)}
                    className={styles.urlInput}
                    autoFocus
                  />
                  <button type="submit" className={styles.submitBtn} disabled={isLoading}
                    style={submitBtnStyle}
                  >
                    {isLoading ? t('loading') : t('upload')}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowUrlInput(false)}
                  className={styles.cancelBtn}
                  style={cancelBtnStyle}
                >
                  {t('cancel')}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 