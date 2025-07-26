'use client';

import React, { useState, useRef } from 'react';
import { FiUpload, FiImage, FiFile, FiYoutube, FiX, FiPaperclip } from 'react-icons/fi';
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
  onTranslateBook: (file: File, language: string) => void;
}

export default function UploadDropdown({
  isOpen,
  onClose,
  onFileUpload,
  onYouTubeUpload,
  onImageUpload,
  onUrlExtract,
  onTranslateBook
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
  const [showTranslateBookInput, setShowTranslateBookInput] = useState(false);
  const [translateBookFile, setTranslateBookFile] = useState<File | null>(null);
  const translateBookFileInputRef = useRef<HTMLInputElement>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [customLanguage, setCustomLanguage] = useState('');

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

  const handleTranslateBookFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTranslateBookFile(file);
    }
  };

  const handleTranslateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!translateBookFile) return;
    let lang = selectedLanguage === 'custom' ? customLanguage : selectedLanguage;
    if (!lang) {
      alert('Пожалуйста, выберите язык перевода');
      return;
    }
    setIsLoading(true);
    try {
      await onTranslateBook(translateBookFile, lang);
      setShowTranslateBookInput(false);
      setTranslateBookFile(null);
      setSelectedLanguage('');
      setCustomLanguage('');
      onClose();
    } catch (error) {
      // Ошибка уже обработана в ChatInterface
    } finally {
      setIsLoading(false);
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

  // Функция для обрезки длинных имен файлов
  const truncateFileName = (fileName: string, maxLength: number = 20) => {
    if (fileName.length <= maxLength) return fileName;
    
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex === -1) {
      // Если нет расширения, просто обрезаем
      return fileName.substring(0, 3) + '...';
    }
    
    const name = fileName.substring(0, lastDotIndex);
    const extension = fileName.substring(lastDotIndex);
    
    if (name.length <= 3) {
      return name + extension;
    }
    
    return name.substring(0, 3) + '...' + extension;
  };

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
                <span className={styles.optionTitle} style={{ color: chatThemeLight ? '#23232a' : '#fff' }}>{t('file')}</span>
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
                <span className={styles.optionTitle} style={{ color: chatThemeLight ? '#23232a' : '#fff' }}>{t('image')}</span>
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
                  <span className={styles.optionTitle} style={{ color: chatThemeLight ? '#23232a' : '#fff' }}>{t('siteUrl')}</span>
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

          {/* Кнопка Перевести книгу */}
          <div className={styles.option}>
            {!showTranslateBookInput ? (
              <button
                className={styles.optionBtn}
                style={getOptionBtnStyle(false)}
                onClick={() => setShowTranslateBookInput(true)}
              >
                <FiPaperclip className={styles.optionIcon} style={{ color: getIconColor(false) }} />
                <div className={styles.optionText}>
                  <span className={styles.optionTitle} style={{ color: chatThemeLight ? '#23232a' : '#fff' }}>{t('translateBook')}</span>
                  <span className={styles.optionDesc}>{t('translateBookDesc')}</span>
                </div>
              </button>
            ) : (
              <div className={styles.optionBtn} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8, background: chatThemeLight ? '#f7f7fa' : '#23232a' }}>
                {/* Кастомная кнопка выбора файла */}
                <label className={styles.translateBookFileLabel} style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <FiPaperclip size={18} style={{ color: chatThemeLight ? '#f59e42' : '#ff9800' }} />
                  {translateBookFile ? t('file') + ': ' + truncateFileName(translateBookFile.name) : t('file')}
                  <input
                    ref={translateBookFileInputRef}
                    type="file"
                    accept=".txt,.docx,.doc,.epub,.fb2"
                    onChange={handleTranslateBookFileSelect}
                    className={styles.translateBookFileInput}
                    style={{ display: 'none' }}
                  />
                </label>
                {translateBookFile && (
                  <div className={styles.translateBookFileName}>{truncateFileName(translateBookFile.name)}</div>
                )}
                {/* Выбор языка */}
                <select
                  value={selectedLanguage}
                  onChange={e => setSelectedLanguage(e.target.value)}
                  className={styles.translateBookSelect}
                  style={{ marginBottom: 6 }}
                >
                  <option value="">{t('selectLanguage')}</option>
                  <option value="en">English</option>
                  <option value="ru">Русский</option>
                  <option value="de">Deutsch</option>
                  <option value="fr">Français</option>
                  <option value="es">Español</option>
                  <option value="zh">中文</option>
                  <option value="custom">{t('customLanguage')}</option>
                </select>
                {selectedLanguage === 'custom' && (
                  <input
                    type="text"
                    placeholder={t('enterLanguage')}
                    value={customLanguage}
                    onChange={e => setCustomLanguage(e.target.value)}
                    className={styles.translateBookCustomInput}
                    style={{ marginBottom: 6 }}
                  />
                )}
                {/* Кнопка Перевести */}
                <button type="button" className={styles.translateBookSubmitBtn} disabled={isLoading || !translateBookFile || !(selectedLanguage || customLanguage)}
                  onClick={e => { e.preventDefault(); handleTranslateBook(e as any); }}
                >
                  {isLoading ? t('loading') : t('translate')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowTranslateBookInput(false)}
                  className={styles.translateBookCancelBtn}
                >
                  {t('cancel')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 