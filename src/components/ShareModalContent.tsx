'use client';

import { useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { FiCopy, FiDownload, FiShare2 } from 'react-icons/fi';

interface ShareModalContentProps {
  shareUrl: string;
  chatTitle: string;
  onCopyLink: () => void;
  onDownloadQR: () => void;
  onShare: () => void;
  copied: boolean;
}

export default function ShareModalContent({ 
  shareUrl, 
  chatTitle, 
  onCopyLink, 
  onDownloadQR, 
  onShare, 
  copied 
}: ShareModalContentProps) {
  return (
    <div style={{ padding: '20px', color: '#fff' }}>
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#f59e42' }}>Поделиться чатом</h3>
        <p style={{ margin: '0', fontSize: '0.9em', opacity: 0.8 }}>
          Отправьте эту ссылку друзьям, чтобы они могли увидеть историю чата
        </p>
      </div>
      
      {/* QR-код */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <div style={{ 
          display: 'inline-block', 
          padding: '20px', 
          background: '#fff', 
          borderRadius: '8px',
          marginBottom: '10px'
        }}>
          <QRCodeCanvas value={shareUrl} size={150} />
        </div>
        <p style={{ fontSize: '0.8em', opacity: 0.7 }}>
          Отсканируйте QR-код для быстрого доступа
        </p>
      </div>
      
      {/* Ссылка */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9em' }}>
          Ссылка для шаринга:
        </label>
        <div style={{ 
          display: 'flex', 
          gap: '8px',
          background: '#2a2a2a',
          borderRadius: '6px',
          padding: '8px'
        }}>
          <input
            type="text"
            value={shareUrl}
            readOnly
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: '#fff',
              fontSize: '0.8em',
              outline: 'none'
            }}
          />
          <button
            onClick={onCopyLink}
            style={{
              background: copied ? '#4CAF50' : '#f59e42',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              padding: '6px 12px',
              cursor: 'pointer',
              fontSize: '0.8em',
              transition: 'background 0.2s'
            }}
          >
            <FiCopy size={14} />
          </button>
        </div>
      </div>
      
      {/* Кнопки действий */}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <button
          onClick={onShare}
          style={{
            background: '#f59e42',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '10px 16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.9em'
          }}
        >
          <FiShare2 size={16} />
          Поделиться
        </button>
        
        <button
          onClick={onDownloadQR}
          style={{
            background: '#2a2a2a',
            color: '#fff',
            border: '1px solid #f59e42',
            borderRadius: '6px',
            padding: '10px 16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.9em'
          }}
        >
          <FiDownload size={16} />
          QR-код
        </button>
      </div>
      
      {copied && (
        <div style={{ 
          textAlign: 'center', 
          marginTop: '10px', 
          color: '#4CAF50', 
          fontSize: '0.8em' 
        }}>
          Ссылка скопирована!
        </div>
      )}
    </div>
  );
} 