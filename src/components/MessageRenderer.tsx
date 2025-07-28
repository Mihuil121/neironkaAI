'use client';

import React, { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import styles from './MessageRenderer.module.scss';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { parse } from 'mathjs';
import MarkdownCodeBlock from './MarkdownCodeBlock';
import MarkdownInlineCode from './MarkdownInlineCode';
import remarkGfm from 'remark-gfm';

interface MessageRendererProps {
  content: string;
  className?: string;
  themeLight?: boolean;
  role?: 'user' | 'assistant';
}

function autoMathToLatex(text: string): string {
  // Заменяем греческие буквы на латинские переменные для mathjs и √ на sqrt
  let replaced = text
    .replace(/π/g, 'pi')
    .replace(/σ/g, 'sigma')
    .replace(/μ/g, 'mu')
    .replace(/√\(([^)]+)\)/g, 'sqrt($1)');

  // Находим формулы вида f(x) = ...
  return replaced.replace(/([a-zA-Z0-9_]+\(.*\)\s*=\s*.+)/g, (match) => {
    try {
      const [left, right] = match.split('=');
      const node = parse(right.trim());
      let latex = node.toTex();
      // Возвращаем с LaTeX-обозначениями греческих букв
      latex = latex.replace(/pi/g, '\\pi').replace(/sigma/g, '\\sigma').replace(/mu/g, '\\mu');
      return `$$${left.trim()} = ${latex}$$`;
    } catch {
      return match;
    }
  });
}

function autoMatrixToLatex(text: string): string {
  // Удаляем все $$ вокруг матриц, если они есть
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, '$1');
  // Находим блоки вида | ... | ... | ... |
  return text.replace(
    /((?:\|[^\n]+\|\n?){2,})/g,
    (block) => {
      const rows = block
        .trim()
        .split('\n')
        .map(row => row.replace(/\|/g, '').trim().replace(/\s+/g, ' & '));
      return `$$\n\\begin{pmatrix}\n${rows.join(' \\ ')}\n\\end{pmatrix}\n$$\n`;
    }
  );
}

export default function MessageRenderer({ content, className, themeLight }: MessageRendererProps) {
  useEffect(() => {
    // Принудительно пересчитываем подсветку синтаксиса после рендера
    if (typeof window !== 'undefined') {
      const prism = require('prismjs');
      prism.highlightAll();
    }
  }, [content]);

  const color = themeLight ? '#18181a' : '#e5e7eb';

  // Логика стилей для таблиц в зависимости от темы
  const tableStyles = {
    table: {
      width: '100%',
      borderCollapse: 'collapse' as const,
      margin: '1rem 0',
      borderRadius: '8px',
      overflow: 'hidden',
      border: themeLight ? '1px solid #f3d9b6' : '1px solid #374151',
      background: themeLight ? '#fff' : '#1f2937',
    },
    thead: {
      background: themeLight ? '#ffe7c2' : '#374151',
    },
    tbody: {
      background: themeLight ? '#fff' : '#1f2937',
    },
    tr: {
      borderBottom: themeLight ? '1px solid #f3d9b6' : '1px solid #374151',
    },
    th: {
      padding: '0.75rem',
      textAlign: 'left' as const,
      fontWeight: 600,
      color: themeLight ? '#18181a' : '#fff',
      background: themeLight ? '#ffe7c2' : '#374151',
      borderRight: themeLight ? '1px solid #f3d9b6' : '1px solid #4b5563',
    },
    td: {
      padding: '0.75rem',
      borderRight: themeLight ? '1px solid #f3d9b6' : '1px solid #374151',
      color: themeLight ? '#18181a' : '#e5e7eb',
    },
  };

  return (
    <div className={`${styles.messageRenderer} ${className || ''}`} style={{ color }}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Кастомный рендер для блоков кода
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            if (inline) {
              return (
                <MarkdownInlineCode {...props}>{children}</MarkdownInlineCode>
              );
            }
            return (
              <MarkdownCodeBlock language={language}>{children}</MarkdownCodeBlock>
            );
          },
          // Кастомный рендер для таблиц
          table({ children, ...props }: any) {
            return (
              <table {...props} style={tableStyles.table}>
                {children}
              </table>
            );
          },
          thead({ children, ...props }: any) {
            return (
              <thead {...props} style={tableStyles.thead}>
                {children}
              </thead>
            );
          },
          tbody({ children, ...props }: any) {
            return (
              <tbody {...props} style={tableStyles.tbody}>
                {children}
              </tbody>
            );
          },
          tr({ children, ...props }: any) {
            return (
              <tr {...props} style={tableStyles.tr}>
                {children}
              </tr>
            );
          },
          th({ children, ...props }: any) {
            return (
              <th {...props} style={tableStyles.th}>
                {children}
              </th>
            );
          },
          td({ children, ...props }: any) {
            return (
              <td {...props} style={tableStyles.td}>
                {children}
              </td>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
} 