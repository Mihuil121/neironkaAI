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

  return (
    <div className={`${styles.messageRenderer} ${className || ''}`} style={{ color }}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
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
          }
        }}
      >
        {autoMathToLatex(autoMatrixToLatex(content))}
      </ReactMarkdown>
    </div>
  );
} 