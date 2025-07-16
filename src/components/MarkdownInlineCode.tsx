import styles from './MessageRenderer.module.scss';

export default function MarkdownInlineCode({ children }: { children: React.ReactNode }) {
  return <code className={styles.inlineCode}>{children}</code>;
} 