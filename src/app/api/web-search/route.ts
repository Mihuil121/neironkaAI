import { NextRequest, NextResponse } from 'next/server';

// In-memory cache (query -> { results, expires })
const cache: Record<string, { results: any[], expires: number }> = {};

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();
    const signal = request.signal;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Неверный запрос' },
        { status: 400 }
      );
    }

    // Проверка длины запроса
    if (query.length > 500) {
      return NextResponse.json(
        { error: 'Запрос слишком длинный' },
        { status: 400 }
      );
    }

    // Проверка на спам
    const spamPatterns = [
      /(.)\1{10,}/, // Повторяющиеся символы
      /[A-Z]{20,}/, // Много заглавных букв
      /[!@#$%^&*()]{10,}/, // Много спецсимволов
    ];
    for (const pattern of spamPatterns) {
      if (pattern.test(query)) {
        return NextResponse.json(
          { error: 'Запрос содержит недопустимые символы' },
          { status: 400 }
        );
      }
    }

    // Кэш: 3 минуты
    const now = Date.now();
    if (cache[query] && cache[query].expires > now) {
      return NextResponse.json({ results: cache[query].results });
    }

    // Параллельный поиск Google и DuckDuckGo с таймаутом
    const searchWithTimeout = (fn: () => Promise<any[]>, timeoutMs: number) => {
      return Promise.race([
        fn(),
        new Promise<any[]>((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs))
      ]);
    };

    const googlePromise = async () => {
      const googleSr = await import('google-sr');
      const results = await googleSr.search({ query });
      return results
        .filter((r: any) => r.link && typeof r.link === 'string' && r.link.startsWith('http'))
        .map((r: any) => ({
          title: r.title || '',
          url: r.link,
          snippet: r.description || '',
          favicon: `https://www.google.com/s2/favicons?domain=${r.link ? new URL(r.link).hostname : ''}`
        }));
    };
    const ddgPromise = async () => {
      const ddg = await import('duckduckgo-search');
      const results = await ddg.search(query, { safeSearch: false, maxResults: 8 });
      return results
        .filter((r: any) => r.url && typeof r.url === 'string' && r.url.startsWith('http'))
        .map((r: any) => ({
          title: r.title || '',
          url: r.url,
          snippet: r.snippet || '',
          favicon: `https://www.google.com/s2/favicons?domain=${r.url ? new URL(r.url).hostname : ''}`
        }));
    };

    // Проверяем отмену перед началом поиска
    if (signal.aborted) {
      return NextResponse.json({ error: 'Запрос отменен пользователем' }, { status: 499 });
    }
    
    let allResults: any[] = [];
    try {
      const [googleResults, ddgResults] = await Promise.all([
        searchWithTimeout(googlePromise, 5000).catch(() => []),
        searchWithTimeout(ddgPromise, 5000).catch(() => [])
      ]);
      // Уникальные по url
      const seen = new Set<string>();
      allResults = [...googleResults, ...ddgResults].filter(r => {
        if (seen.has(r.url)) return false;
        seen.add(r.url);
        return true;
      });
    } catch (e) {
      // Если оба поиска упали — ошибка
      return NextResponse.json({ error: 'Ошибка поиска' }, { status: 500 });
    }

    // Проверяем отмену перед возвратом результатов
    if (signal.aborted) {
      return NextResponse.json({ error: 'Запрос отменен пользователем' }, { status: 499 });
    }
    
    const filtered = allResults.slice(0, 4);
    if (filtered.length === 0) {
      return NextResponse.json({ error: 'Не найдено подходящих сайтов' }, { status: 404 });
    }
    // Кэшируем
    cache[query] = { results: filtered, expires: now + 3 * 60 * 1000 };
    return NextResponse.json({ results: filtered });
  } catch (error) {
    console.error('Ошибка веб-поиска:', error);
    return NextResponse.json(
      { error: 'Ошибка при выполнении поиска' },
      { status: 500 }
    );
  }
} 