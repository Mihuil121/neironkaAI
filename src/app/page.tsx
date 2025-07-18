'use client';
import { useRef, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import AuthModal from '@/components/AuthModal';
import ChatInterface from '@/components/ChatInterface';
import styles from './page.module.scss';
import Image from 'next/image';
import aiphoto from '../image/AI.png';
import chatphoto from '../image/chat.png';
import surchphoto from '../image/surch.png';
import filephoto from '../image/file.png';
import languagephoto from '../image/language.jpg';
import savephoto from '../image/save.png';
import speedphoto from '../image/speed.png';
import helpphoto from '../image/help.png';

// Переводы для hero-сцены
const translations = {
  ru: {
    sections: [
      { title: 'Neironka AI', desc: 'AI-чат-бот нового поколения. Общение, поиск, анализ файлов и приватность — всё в одном месте. Быстро. Умно. Безопасно.' },
      { title: 'Мультиязычный чат', desc: 'Понимает и отвечает на десятках языков мира. Общайтесь без границ!' },
      { title: 'Поиск в интернете', desc: 'Находит и анализирует информацию с сайтов, выдаёт только актуальные ответы.' },
      { title: 'Анализ файлов', desc: 'Извлекает и изучает содержимое документов, картинок, видео и аудио.' },
      { title: 'Языковая поддержка', desc: 'Работает с разными языками, переводит и понимает контекст.' },
      { title: 'Приватность', desc: 'Все ваши данные защищены и не покидают ваш браузер.' },
      { title: 'Молниеносная работа', desc: 'Ответы и поиск без задержек — всё работает быстро и плавно.' },
      { title: 'Ваша поддержка', desc: 'Мы не справимся без вашей поддержки!' },
    ],
    button: 'Начать общение',
    support: 'Мы не справимся без вашей поддержки!'
  },
  en: {
    sections: [
      { title: 'Neironka AI', desc: 'Next-gen AI chatbot. Chat, search, file analysis & privacy — all in one. Fast. Smart. Secure.' },
      { title: 'Multilingual Chat', desc: 'Understands and replies in dozens of languages. Communicate without borders!' },
      { title: 'Web Search', desc: 'Finds and analyzes info from sites, gives only relevant answers.' },
      { title: 'File Analysis', desc: 'Extracts and studies content of documents, images, video, and audio.' },
      { title: 'Language Support', desc: 'Works with different languages, translates and understands context.' },
      { title: 'Privacy', desc: 'All your data is protected and never leaves your browser.' },
      { title: 'Lightning Fast', desc: 'Answers and search with no delays — everything works quickly and smoothly.' },
      { title: 'Your Support', desc: 'We can’t do it without your support!' },
    ],
    button: 'Start Chatting',
    support: 'We can’t do it without your support!'
  },
  zh: {
    sections: [
      { title: 'Neironka AI', desc: '新一代AI聊天机器人。聊天、搜索、文件分析和隐私保护一站式搞定。快速、智能、安全。' },
      { title: '多语言聊天', desc: '支持多种语言的理解和回复。无国界沟通！' },
      { title: '网络搜索', desc: '从网站查找和分析信息，只给出相关答案。' },
      { title: '文件分析', desc: '提取和分析文档、图片、视频和音频内容。' },
      { title: '语言支持', desc: '支持多种语言，翻译并理解上下文。' },
      { title: '隐私保护', desc: '您的所有数据都受到保护，绝不会离开您的浏览器。' },
      { title: '极速体验', desc: '即时响应与搜索，一切都快速流畅。' },
      { title: '您的支持', desc: '没有您的支持我们无法做到！' },
    ],
    button: '开始聊天',
    support: '没有您的支持我们无法做到！'
  },
  fil: {
    sections: [
      { title: 'Neironka AI', desc: 'AI chatbot ng bagong henerasyon. Chat, search, file analysis at privacy — lahat sa isa. Mabilis. Matalino. Ligtas.' },
      { title: 'Multilingual Chat', desc: 'Nakakaintindi at sumasagot sa dose-dosenang wika. Makipag-usap nang walang hangganan!' },
      { title: 'Web Search', desc: 'Naghahanap at sumusuri ng impormasyon mula sa mga site, tanging may kaugnayang sagot lang.' },
      { title: 'File Analysis', desc: 'Kinukuha at pinag-aaralan ang nilalaman ng mga dokumento, larawan, video, at audio.' },
      { title: 'Language Support', desc: 'Gumagana sa iba’t ibang wika, nagsasalin at nakakaunawa ng konteksto.' },
      { title: 'Privacy', desc: 'Lahat ng iyong data ay protektado at hindi umaalis sa iyong browser.' },
      { title: 'Mabilis na Trabaho', desc: 'Mga sagot at paghahanap na walang delay — mabilis at maayos ang lahat.' },
      { title: 'Suporta Mo', desc: 'Hindi namin magagawa ito nang wala ang iyong suporta!' },
    ],
    button: 'Simulan ang Chat',
    support: 'Hindi namin magagawa ito nang wala ang iyong suporta!'
  },
};

// LanguageSwitcher компонент
const LANGS = [
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'fil', label: 'Filipino', flag: '🇵🇭' },
];

function LanguageSwitcher({ lang, setLang }: { lang: keyof typeof translations, setLang: (l: keyof typeof translations) => void }) {
  return (
    <div className={styles.languageSwitcher}>
      {LANGS.map(l => (
        <button
          key={l.code}
          onClick={() => setLang(l.code as keyof typeof translations)}
          style={{
            background: lang === l.code ? '#f3f7fd' : 'white',
            border: lang === l.code ? '2px solid #3b82f6' : '1.5px solid #e5e7eb',
            borderRadius: 12,
            padding: '6px 12px',
            fontWeight: 700,
            fontSize: 18,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: lang === l.code ? '0 2px 8px rgba(59,130,246,0.08)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          <span style={{ fontSize: 20 }}>{l.flag}</span> {l.code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

export default function Home() {
  // ВСЕ хуки в начале!
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user, isAuthenticated } = useAuthStore();
  const [lang, setLang] = useState<keyof typeof translations>('ru');
  const [isClient, setIsClient] = useState(false);
  const [visibleSections, setVisibleSections] = useState<Set<number>>(new Set());
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => { setIsClient(true); }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isClient) return;
    const observer = new window.IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const idx = Number(entry.target.getAttribute('data-section-idx'));
          if (entry.isIntersecting) {
            setVisibleSections((prev) => {
              if (prev.has(idx)) return prev;
              const next = new Set(prev);
              next.add(idx);
              return next;
            });
          }
        });
      },
      { threshold: 0.25 }
    );
    sectionRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });
    return () => observer.disconnect();
  }, [isClient]);

  // Только после хуков — условный return
  if (!isClient) return <div style={{minHeight: '100vh'}} />;

  if (isAuthenticated) {
    return <ChatInterface />;
  }

  const sections: { img: any }[] = [
    { img: aiphoto },
    { img: chatphoto },
    { img: surchphoto },
    { img: filephoto },
    { img: languagephoto },
    { img: savephoto },
    { img: speedphoto },
    { img: helpphoto },
  ];

  return (
    <div className={styles.sectionsBg}>
      <LanguageSwitcher lang={lang} setLang={setLang} />
      {sections.map((section, idx) => (
        <div
          key={idx}
          ref={el => { sectionRefs.current[idx] = el; }}
          data-section-idx={idx}
          className={
            [
              idx % 2 === 0 ? styles.sectionRow : styles.sectionRowReverse,
              visibleSections.has(idx) ? styles.visibleSection : styles.hiddenSection
            ].join(' ')
          }
        >
          <div className={styles.sectionImgWrap}>
            <Image src={section.img} alt={translations[lang].sections[idx].title} width={220} height={220} className={styles.sectionImg} />
          </div>
          <div className={styles.sectionTextWrap}>
            <h2 className={styles.sectionTitle}>{translations[lang].sections[idx].title}</h2>
            <p className={styles.sectionDesc}>{translations[lang].sections[idx].desc}</p>
            {idx === 0 && (
              <button
                className={styles.ctaButton}
                onClick={() => setShowAuthModal(true)}
              >
                {translations[lang].button}
              </button>
            )}
            {idx === 7 && (
              <div className={styles.supportBlock}>
                <Image src={helpphoto} alt="Поддержка" width={28} height={28} />
                <span>{translations[lang].support}</span>
              </div>
            )}
          </div>
        </div>
      ))}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
}