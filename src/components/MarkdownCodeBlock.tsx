import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import styles from './MessageRenderer.module.scss';

export default function MarkdownCodeBlock({ language, children }: { language: string, children: React.ReactNode }) {
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
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    </div>
  );
} 