import React from 'react';

interface AuthModalHeaderProps {
  isLogin: boolean;
  onSwitch: () => void;
  onClose: () => void;
}

export default function AuthModalHeader({ isLogin, onSwitch, onClose }: AuthModalHeaderProps) {
  return (
    <div className="auth-modal-header">
      <button className="auth-modal-close" onClick={onClose}>×</button>
      <h2>{isLogin ? 'Вход' : 'Регистрация'}</h2>
      <button className="auth-modal-switch" onClick={onSwitch}>
        {isLogin ? 'Создать аккаунт' : 'Уже есть аккаунт?'}
      </button>
    </div>
  );
} 