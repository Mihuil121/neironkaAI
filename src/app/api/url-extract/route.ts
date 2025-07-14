import { NextRequest, NextResponse } from 'next/server';
import { Readability } from '@mozilla/readability';
import * as cheerio from 'cheerio';
import { JSDOM } from 'jsdom';

// In-memory cache (url -> { text, expires })
const cache: Record<string, { text: string, expires: number }> = {};

async function improvedScraper(url: string) {
    // Кэш: 3 минуты
    const now = Date.now();
    if (cache[url] && cache[url].expires > now) {
        return cache[url].text;
    }
    let controller: AbortController | null = null;
    try {
        controller = new AbortController();
        const timeout = setTimeout(() => controller!.abort(), 7000); // 7 секунд таймаут
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            },
            signal: controller.signal
        });
        clearTimeout(timeout);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const html = await response.text();
        // 1. Попытка через Readability.js (лучшее качество)
        try {
            const dom = new JSDOM(html, { url });
            const reader = new Readability(dom.window.document);
            const article = reader.parse();
            if (article && article.textContent && article.textContent.length > 500) {
                cache[url] = { text: article.textContent, expires: now + 3 * 60 * 1000 };
                return article.textContent;
            }
        } catch {}
        // 2. Попытка через Cheerio (быстро)
        const $ = cheerio.load(html);
        // Удаляем мусор
        $('script, style, noscript, template').remove();
        $('[style*="display:none"], [style*="visibility:hidden"]').remove();
        // Стратегии поиска основного текста
        const strategies = [
            () => $('main').text(),
            () => $('article').text(),
            () => $('.article-content').text(),
            () => $('#content').text(),
            () => $('.content').text(),
            () => {
                let maxText = '';
                $('div').each((_, el) => {
                    const text = $(el).text().trim();
                    if (text.length > maxText.length && text.length > 1000) {
                        maxText = text;
                    }
                });
                return maxText;
            },
            () => {
                let text = $('body').text();
                text = text.replace(/Главная[\s\S]*?Контакты/, '');
                text = text.replace(/©[\s\S]*?права защищены/, '');
                return text;
            }
        ];
        for (let i = 0; i < strategies.length; i++) {
            const result = strategies[i]();
            if (result && result.length > 500) {
                cache[url] = { text: result, expires: now + 3 * 60 * 1000 };
                return result;
            }
        }
        return null;
    } catch (error: any) {
        if (controller) controller.abort();
        return null;
    }
}

export async function POST(request: NextRequest) {
    try {
        const { url } = await request.json();
        if (!url || typeof url !== 'string') {
            return NextResponse.json({ error: 'URL обязателен' }, { status: 400 });
        }
        const text = await improvedScraper(url);
        if (!text) {
            return NextResponse.json({ error: 'Не удалось извлечь текст с сайта' }, { status: 422 });
        }
        return NextResponse.json({ text });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Ошибка сервера' }, { status: 500 });
    }
} 