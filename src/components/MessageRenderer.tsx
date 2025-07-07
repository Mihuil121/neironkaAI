'use client';

import React, { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import styles from './MessageRenderer.module.scss';

interface MessageRendererProps {
  content: string;
  className?: string;
}

export default function MessageRenderer({ content, className }: MessageRendererProps) {
  useEffect(() => {
    // Принудительно пересчитываем подсветку синтаксиса после рендера
    if (typeof window !== 'undefined') {
      const prism = require('prismjs');
      prism.highlightAll();
    }
  }, [content]);

  return (
    <div className={`${styles.messageRenderer} ${className || ''}`}>
      <ReactMarkdown
        components={{
          // Кастомный рендер для блоков кода
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            
            if (inline) {
              return (
                <code className={styles.inlineCode} {...props}>
                  {children}
                </code>
              );
            }

            return (
              <div className={styles.codeBlock}>
                {language && (
                  <div className={styles.codeHeader}>
                    <span className={styles.languageLabel}>{language}</span>
                  </div>
                )}
                <SyntaxHighlighter
                  style={tomorrow}
                  language={language}
                  PreTag="div"
                  customStyle={{
                    margin: 0,
                    borderRadius: language ? '0 0 8px 8px' : '8px',
                    fontSize: '14px',
                    lineHeight: '1.5',
                  }}
                  {...props}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              </div>
            );
          },
          
          // Кастомный рендер для заголовков
          h1: ({ children }) => <h1 className={styles.h1}>{children}</h1>,
          h2: ({ children }) => <h2 className={styles.h2}>{children}</h2>,
          h3: ({ children }) => <h3 className={styles.h3}>{children}</h3>,
          h4: ({ children }) => <h4 className={styles.h4}>{children}</h4>,
          h5: ({ children }) => <h5 className={styles.h5}>{children}</h5>,
          h6: ({ children }) => <h6 className={styles.h6}>{children}</h6>,
          
          // Кастомный рендер для параграфов
          p: ({ children }) => <p className={styles.paragraph}>{children}</p>,
          
          // Кастомный рендер для списков
          ul: ({ children }) => <ul className={styles.ul}>{children}</ul>,
          ol: ({ children }) => <ol className={styles.ol}>{children}</ol>,
          li: ({ children }) => <li className={styles.li}>{children}</li>,
          
          // Кастомный рендер для ссылок
          a: ({ href, children }) => (
            <a href={href} className={styles.link} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          
          // Кастомный рендер для блоков цитат
          blockquote: ({ children }) => (
            <blockquote className={styles.blockquote}>{children}</blockquote>
          ),
          
          // Кастомный рендер для таблиц
          table: ({ children }) => <table className={styles.table}>{children}</table>,
          thead: ({ children }) => <thead className={styles.thead}>{children}</thead>,
          tbody: ({ children }) => <tbody className={styles.tbody}>{children}</tbody>,
          tr: ({ children }) => <tr className={styles.tr}>{children}</tr>,
          th: ({ children }) => <th className={styles.th}>{children}</th>,
          td: ({ children }) => <td className={styles.td}>{children}</td>,
          
          // Кастомный рендер для горизонтальной линии
          hr: () => <hr className={styles.hr} />,
          
          // Кастомный рендер для жирного текста
          strong: ({ children }) => <strong className={styles.strong}>{children}</strong>,
          
          // Кастомный рендер для курсива
          em: ({ children }) => <em className={styles.em}>{children}</em>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
} 