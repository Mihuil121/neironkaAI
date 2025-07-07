import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'node-html-parser';

async function improvedScraper(url: string) {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const html = await response.text();
        const root = parse(html);
        const strategies = [
            () => root.querySelector('main')?.text,
            () => root.querySelector('article')?.text,
            () => root.querySelector('.article-content')?.text,
            () => root.querySelector('#content')?.text,
            () => root.querySelector('.content')?.text,
            () => {
                const divs = root.querySelectorAll('div');
                let maxText = '';
                divs.forEach(div => {
                    const text = div.text.trim();
                    if (text.length > maxText.length && text.length > 1000) {
                        maxText = text;
                    }
                });
                return maxText;
            },
            () => {
                const body = root.querySelector('body');
                if (body) {
                    let text = body.text;
                    text = text.replace(/Главная[\s\S]*?Контакты/, '');
                    text = text.replace(/©[\s\S]*?права защищены/, '');
                    return text;
                }
                return null;
            }
        ];
        for (let i = 0; i < strategies.length; i++) {
            const result = strategies[i]();
            if (result && result.length > 500) {
                return result;
            }
        }
        return null;
    } catch (error: any) {
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
        const limitedText = text.slice(0, 2000);
        return NextResponse.json({ text: limitedText });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Ошибка сервера' }, { status: 500 });
    }
} 