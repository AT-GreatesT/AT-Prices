import CONFIG from '../config.js';

const CATEGORY_NAMES = {
    metals: '💎 معادن', oil: '🛢️ نفط', forex: '💱 عملات', crypto: '₿ عملات رقمية',
    economy: '📊 اقتصاد', stocks: '📈 أسهم', general: '📰 عام'
};

document.addEventListener('DOMContentLoaded', loadNewsDetail);

async function loadNewsDetail() {
    const container = document.getElementById('newsDetail');
    const id = Number(new URLSearchParams(window.location.search).get('id'));
    const storedItem = readStoredNews();
    if (storedItem?.title) {
        renderDetail(container, storedItem);
        return;
    }

    try {
        const response = await fetch(`${CONFIG.API_URL}?t=${Date.now()}`, {
            headers: { 'X-My-App-Auth': CONFIG.API_SECRET_KEY, Accept: 'application/json' }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const items = parseNews(data.newsData);
        const item = items[id - 1];
        if (!item?.title) throw new Error('News item not found');
        renderDetail(container, item);
    } catch (error) {
        console.error('News detail error:', error);
        const item = readStoredNews();
        if (item?.title) renderDetail(container, item);
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
    return Array.isArray(data) ? data.filter(item => item?.title).map(item => ({
        title: String(item.title), link: safeLink(item.link), source: String(item.source || 'مصدر اقتصادي'),
        time: String(item.time || 'اليوم'), category: item.category || 'general',
        description: String(item.description || item.summary || item.content || '')
    })) : [];
}

function renderDetail(container, item) {
    container.innerHTML = `<div class="detail-meta"><span class="news-category ${item.category}">${CATEGORY_NAMES[item.category] || CATEGORY_NAMES.general}</span><time>${escapeHtml(item.time)}</time></div>
    <h2>${escapeHtml(item.title)}</h2><a class="detail-source detail-source-link" href="${item.link}" target="_blank" rel="noopener noreferrer"><i class="fas fa-building"></i> الناشر: ${escapeHtml(item.source)}</a>
        <div class="detail-content"><h3>ملخص الخبر</h3><p>${escapeHtml(item.description || 'لا يحتوي مصدر البيانات الحالي على نص الخبر الكامل. يعرض الموقع العنوان والبيانات الأساسية، ويمكن قراءة التفاصيل الكاملة من موقع الناشر.')}</p></div>
        <p class="detail-disclaimer">الخبر منقول من المصدر الأصلي، وقد تختلف تفاصيله أو تتحدث بعد آخر تحديث.</p>
    <a class="detail-source-button" href="${item.link}" target="_blank" rel="noopener noreferrer"><i class="fas fa-external-link-alt"></i> قراءة الخبر كاملًا من موقع الناشر</a>`;
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
