import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

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

    // Динамический импорт google-sr
    const googleSr = await import('google-sr');
    const results = await googleSr.search({ query });
    // Оставляем только реальные сайты с текстом
    const filtered = results
      .filter((r: any) => r.link && typeof r.link === 'string' && r.link.startsWith('http'))
      .slice(0, 4)
      .map((r: any) => ({
        title: r.title || '',
        url: r.link,
        snippet: r.description || '',
        favicon: `https://www.google.com/s2/favicons?domain=${r.link ? new URL(r.link).hostname : ''}`
      }));

    if (filtered.length === 0) {
      return NextResponse.json({ error: 'Не найдено подходящих сайтов' }, { status: 404 });
    }

    return NextResponse.json({ results: filtered });
  } catch (error) {
    console.error('Ошибка веб-поиска:', error);
    return NextResponse.json(
      { error: 'Ошибка при выполнении поиска' },
      { status: 500 }
    );
  }
} 