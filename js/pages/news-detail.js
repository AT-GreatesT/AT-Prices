import { fetchMarketData } from '../modules/api.js';

const CATEGORY_NAMES = {
    metals: '💎 معادن', oil: '🛢️ نفط', forex: '💱 عملات', crypto: '₿ عملات رقمية',
    economy: '📊 اقتصاد', stocks: '📈 أسهم', general: '📰 عام'
};

document.addEventListener('DOMContentLoaded', loadNewsDetail);

async function loadNewsDetail() {
    const container = document.getElementById('newsDetail');
    const requestedId = new URLSearchParams(window.location.search).get('id');
    const storedItem = readStoredNews();
    if (storedItem?.title && (!requestedId || String(storedItem.id) === requestedId)) {
        renderDetail(container, storedItem);
        return;
    }

    try {
        const data = await fetchMarketData();
        const items = parseNews(data.newsData ?? data.news ?? data.data ?? data.payload);
        const item = findNewsItem(items, requestedId);
        if (!item?.title) throw new Error('News item not found');
        await renderDetail(container, item);
    } catch (error) {
        console.error('News detail error:', error);
        const item = readStoredNews();
        if (item?.title && (!requestedId || String(item.id) === requestedId)) await renderDetail(container, item);
        else container.innerHTML = '<div class="news-empty"><p>تعذر تحميل تفاصيل الخبر.</p><a href="news.html">العودة إلى الأخبار</a></div>';
    }
}

function readStoredNews() {
    try {
        return JSON.parse(sessionStorage.getItem('selectedNews') || 'null');
    } catch {
        return null;
    }
}

function parseNews(value) {
    let data = value;
    if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch { return []; }
    }
    if (!Array.isArray(data) && data && typeof data === 'object') {
        data = data.newsData ?? data.news ?? data.data ?? data.payload;
        if (typeof data === 'string') {
            try { data = JSON.parse(data); } catch { return []; }
        }
    }
    return Array.isArray(data) ? data.filter(item => item?.title).map((item, index) => ({
        id: item.id ?? index + 1,
        title: String(item.title), link: safeLink(item.link), source: String(item.source || 'مصدر اقتصادي'),
        time: String(item.time || 'اليوم'), category: normalizeCategory(item.category, item.title),
        image: safeImage(item.image), publishedAt: String(item.publishedAt || ''), date: String(item.date || ''),
        description: String(item.description || item.summary || item.content || item.details || item.body || ''),
        article: String(item.article || item.content || item.body || item.details || '')
    })) : [];
}

function findNewsItem(items, requestedId) {
    if (!requestedId) return null;
    const numericId = Number(requestedId);
    return items.find(item => String(item.id) === requestedId)
        || (Number.isInteger(numericId) ? items[numericId - 1] : null);
}

async function renderDetail(container, item) {
    const article = await getArticleText(item);
    container.innerHTML = `<div class="detail-meta"><span class="news-category ${item.category}">${CATEGORY_NAMES[item.category] || CATEGORY_NAMES.general}</span><time>${escapeHtml(item.time)}</time></div>
    ${item.image ? `<img class="detail-image" src="${item.image}" alt="${escapeHtml(item.title)}">` : ''}<h2>${escapeHtml(item.title)}</h2><a class="detail-source detail-source-link" href="${item.link}" target="_blank" rel="noopener noreferrer"><i class="fas fa-building"></i> الناشر: ${escapeHtml(item.source)}</a>${item.date ? `<time class="detail-date">${escapeHtml(item.date)}</time>` : ''}
        <div class="detail-content"><h3>تفاصيل الخبر</h3>${article ? `<div class="article-text">${article}</div>` : `<p>${escapeHtml(item.description || 'لم يرسل مصدر البيانات نص المقالة. يمكن قراءة المقالة كاملة من موقع الناشر.')}</p>`}</div>
        <p class="detail-disclaimer">الخبر منقول من المصدر الأصلي، وقد تختلف تفاصيله أو تتحدث بعد آخر تحديث.</p>
    <a class="detail-source-button" href="${item.link}" target="_blank" rel="noopener noreferrer"><i class="fas fa-external-link-alt"></i> قراءة الخبر كاملًا من موقع الناشر</a>`;
}

function safeImage(value) {
    try {
        const url = new URL(value || '#', window.location.href);
        return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch {
        return '';
    }
}

function normalizeCategory(category, title) {
    const value = String(category || '').toLowerCase();
    if (value === 'اقتصادي' || value === 'economy' || value === 'business') return 'economy';
    return CATEGORY_NAMES[value] ? value : detectCategory(title);
}

function detectCategory(title) {
    const text = String(title).toLowerCase();
    if (/ذهب|فضة|معادن|gold|silver|platinum/.test(text)) return 'metals';
    if (/نفط|بترول|غاز|oil|gas/.test(text)) return 'oil';
    if (/دولار|يورو|جنيه|عملات|currency|forex/.test(text)) return 'forex';
    if (/بتكوين|بيتكوين|عملات رقمية|crypto|bitcoin/.test(text)) return 'crypto';
    if (/أسهم|بورصة|مؤشر|stock|index/.test(text)) return 'stocks';
    if (/فائدة|تضخم|اقتصاد|نمو|inflation|rate|economy/.test(text)) return 'economy';
    return 'general';
}

async function getArticleText(item) {
    const text = item.article || item.content || item.body || item.details || item.description;
    if (text) return escapeHtml(text).replace(/\r?\n/g, '<br>');
    if (!item.link || item.link === '#') return '';

    try {
        const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(item.link)}`);
        if (!response.ok) return '';
        const html = await response.text();
        const document = new DOMParser().parseFromString(html, 'text/html');
        const article = document.querySelector('article, [itemprop="articleBody"], main');
        const paragraphs = [...(article || document).querySelectorAll('p')]
            .map(paragraph => paragraph.textContent.trim())
            .filter(paragraph => paragraph.length > 50)
            .slice(0, 12);
        return paragraphs.length ? paragraphs.map(escapeHtml).join('<br><br>') : '';
    } catch {
        return '';
    }
}

function safeLink(value) {
    try {
        const url = new URL(value || '#', window.location.href);
        return ['http:', 'https:'].includes(url.protocol) ? url.href : '#';
    } catch { return '#'; }
}

function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}
