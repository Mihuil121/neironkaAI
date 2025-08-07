import { NextRequest, NextResponse } from 'next/server';
import { Readability } from '@mozilla/readability';
import * as cheerio from 'cheerio';
import { JSDOM } from 'jsdom';
import YTDlpWrap from 'yt-dlp-wrap';
import fs from 'fs';
import path from 'path';

const cache: Record<string, { text: string, expires: number, type: 'site' } | { text: string, expires: number, type: 'video', videoTitle?: string }> = {};

const VIDEO_PLATFORMS = [
  'youtube.com', 'youtu.be', 'rutube.ru', 'vk.com', 'vkvideo.ru', 'dailymotion.com',
  'vimeo.com', 'twitch.tv', 'tiktok.com', 'instagram.com', 'facebook.com', 'twitter.com'
];

function isVideoPlatform(url: string) {
  return VIDEO_PLATFORMS.some(platform => url.includes(platform));
}

async function extractTextFromSite(url: string) {
  const now = Date.now();
  if (cache[url] && cache[url].expires > now && cache[url].type === 'site') {
    return cache[url].text;
  }
  let controller: AbortController | null = null;
  try {
    controller = new AbortController();
    const timeout = setTimeout(() => controller!.abort(), 7000);
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
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const html = await response.text();
    try {
      const dom = new JSDOM(html, { url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();
      if (article && article.textContent && article.textContent.length > 500) {
        cache[url] = { text: article.textContent, expires: now + 3 * 60 * 1000, type: 'site' };
        return article.textContent;
      }
    } catch {}
    const $ = cheerio.load(html);
    const text = $('body').text().replace(/\s+/g, ' ').trim();
    cache[url] = { text, expires: now + 3 * 60 * 1000, type: 'site' };
    return text;
  } catch (e) {
    throw new Error('Ошибка при извлечении текста с сайта: ' + (e instanceof Error ? e.message : e));
  }
}

async function extractTextFromVideo(url: string): Promise<{ text: string, videoTitle?: string }> {
  const now = Date.now();
  if (cache[url] && cache[url].expires > now && cache[url].type === 'video') {
    return { text: cache[url].text, videoTitle: cache[url].videoTitle };
  }
  const ytDlp = new YTDlpWrap();
  const outputDir = path.join('/tmp', 'subtitles_' + Date.now() + Math.random().toString(36).slice(2));
  fs.mkdirSync(outputDir, { recursive: true });
  let files: string[] = [];
  let subContent = '';
  let videoTitle = '';
  // Получаем длительность видео и название
  let durationText = '';
  try {
    const info = await ytDlp.getVideoInfo(url);
    if (info && info.duration) {
      const totalSeconds = Math.floor(info.duration);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      durationText = `\n\nВидео длится ${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    if (info && info.title) {
      videoTitle = info.title.replace(/[^a-zA-Z0-9а-яА-ЯёЁ\s_-]/g, '').replace(/\s+/g, '_').slice(0, 40);
    }
  } catch {}
  // Сначала пробуем ru,en
  let args = [
    '--write-auto-sub', '--write-sub', '--skip-download', '--sub-lang', 'ru,en', '--sub-format', 'srt/vtt', '--no-warnings', '--quiet', '-o', path.join(outputDir, '%(title)s.%(ext)s'), url
  ];
  try {
    await new Promise((resolve, reject) => {
      ytDlp.exec(args)
        .on('close', resolve)
        .on('error', reject);
    });
    files = fs.readdirSync(outputDir).filter(f => f.endsWith('.srt') || f.endsWith('.vtt'));
  } catch {}
  // Если не нашли, пробуем на всех языках
  if (files.length === 0) {
    args = [
      '--write-auto-sub', '--write-sub', '--skip-download', '--sub-lang', 'all', '--sub-format', 'srt/vtt', '--no-warnings', '--quiet', '-o', path.join(outputDir, '%(title)s.%(ext)s'), url
    ];
    try {
      await new Promise((resolve, reject) => {
        ytDlp.exec(args)
          .on('close', resolve)
          .on('error', reject);
      });
      files = fs.readdirSync(outputDir).filter(f => f.endsWith('.srt') || f.endsWith('.vtt'));
    } catch {}
  }
  if (files.length === 0) {
    fs.rmSync(outputDir, { recursive: true, force: true });
    return { text: 'Субтитры не найдены. Видео не содержит субтитров или они недоступны для скачивания.' + durationText, videoTitle };
  }
  const subPath = path.join(outputDir, files[0]);
  subContent = fs.readFileSync(subPath, 'utf8');
  let text = '';
  if (subPath.endsWith('.srt')) {
    text = subContent
      .split('\n')
      .filter(line =>
        line.trim() &&
        !/^\d+$/.test(line) &&
        !/^\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}/.test(line)
      )
      .join(' ')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  } else if (subPath.endsWith('.vtt')) {
    text = subContent
      .split('\n')
      .filter(line =>
        line.trim() &&
        !/^WEBVTT/.test(line) &&
        !/^Language:/i.test(line) &&
        !/^\d{2}:\d{2}:\d{2}\.\d{3} -->/.test(line) &&
        !/^\d+$/.test(line)
      )
      .join(' ')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  fs.rmSync(outputDir, { recursive: true, force: true });
  text = text + durationText;
  cache[url] = { text, expires: now + 3 * 60 * 1000, type: 'video', videoTitle };
  return { text, videoTitle };
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    if (!url) return NextResponse.json({ error: 'URL не предоставлен' }, { status: 400 });
    let text = '';
    let type: 'site' | 'video' = 'site';
    let videoTitle: string | undefined = undefined;
    if (isVideoPlatform(url)) {
      type = 'video';
      const result = await extractTextFromVideo(url);
      text = result.text;
      videoTitle = result.videoTitle;
      if (text.length > 4000) {
        // Сжимаем текст через /api/compress
        const compressRes = await fetch(request.nextUrl.origin + '/api/compress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, language: 'ru' })
        });
        const compressData = await compressRes.json();
        if (compressRes.ok && compressData.result) {
          text = compressData.result;
        }
      }
    } else {
      text = await extractTextFromSite(url);
    }
    return NextResponse.json({ text, type, videoTitle });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Ошибка обработки ссылки' }, { status: 500 });
  }
} 