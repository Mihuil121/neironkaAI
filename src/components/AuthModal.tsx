'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import styles from './AuthModal.module.scss';
import AuthModalHeader from './AuthModalHeader';
import AuthInput from './AuthInput';
import AuthError from './AuthError';
import { FiX } from 'react-icons/fi';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  });

  const { login, register, isLoading, error, clearError } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (isLogin) {
      await login(formData.email, formData.password);
    } else {
      await register(formData.email, formData.password, formData.name);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose} aria-label="Закрыть">
          <FiX size={28} />
        </button>
        <AuthModalHeader
          isLogin={isLogin}
          onSwitch={() => {
            setIsLogin(!isLogin);
            setFormData({ email: '', password: '', name: '' });
            clearError();
          }}
        />
        <form onSubmit={handleSubmit} className={styles.form}>
          {!isLogin && (
            <AuthInput
              label="Имя"
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required={!isLogin}
              placeholder="Введите ваше имя"
            />
          )}
          <AuthInput
            label="Email"
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            required
            placeholder="Введите email"
          />
          <AuthInput
            label="Пароль"
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            required
            placeholder="Введите пароль"
          />
          <AuthError error={error || ''} />
          <button
            type="submit"
            className={styles.submitButton}
            disabled={isLoading}
          >
            {isLoading ? 'Загрузка...' : (isLogin ? 'Войти' : 'Зарегистрироваться')}
          </button>
        </form>
      </div>
    </div>
  );
} 