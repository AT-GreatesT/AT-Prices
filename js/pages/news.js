import CONFIG from '../config.js';

const REFRESH_INTERVAL = 180000;
let newsData = [];
let currentFilter = 'all';
let refreshTimer;

const CATEGORY_NAMES = {
    metals: '💎 معادن',
    oil: '🛢️ نفط',
    forex: '💱 عملات',
    crypto: '₿ عملات رقمية',
    economy: '📊 اقتصاد',
    stocks: '📈 أسهم',
    general: '📰 عام'
};

document.addEventListener('DOMContentLoaded', () => {
    loadNewsData();
    refreshTimer = setInterval(loadNewsData, REFRESH_INTERVAL);
    document.getElementById('refreshBtn')?.addEventListener('click', loadNewsData);
    document.addEventListener('dataLoaded', event => {
        const sharedNews = normalizeNews(event.detail?.newsData);
        if (sharedNews.length) {
            newsData = sharedNews;
            renderNews();
        }
    });
    document.querySelectorAll('[data-news-section]').forEach(link => {
        link.addEventListener('click', event => {
            event.preventDefault();
            const section = link.dataset.newsSection;
            if (section === 'analysis') {
                setFilter('all');
                window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
                document.getElementById('analysis')?.classList.add('news-section-focus');
            } else {
                setFilter(section);
                window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
            }
            document.querySelectorAll('[data-news-section]').forEach(item => {
                item.parentElement?.classList.toggle('active', item === link);
            });
        });
    });
});

async function loadNewsData() {
    try {
        const localData = window.AT?.appData?.newsData;
        const localNews = normalizeNews(localData);
        if (localNews.length) {
            newsData = localNews;
            renderNews();
            return;
        }

        const response = await fetch(`${CONFIG.API_URL}?t=${Date.now()}`, {
            headers: { 'X-My-App-Auth': CONFIG.API_SECRET_KEY, Accept: 'application/json' }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        newsData = normalizeNews(data.newsData);
        if (!newsData.length) throw new Error('The API returned no news items');
        renderNews();
    } catch (error) {
        console.error('News data error:', error);
        showError('تعذر تحميل الأخبار حاليًا.');
    }
}

function normalizeNews(value) {
    let data = value;
    if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch { return []; }
    }
    if (!Array.isArray(data)) return [];

    return data.filter(item => item && item.title).map((item, index) => ({
        id: index + 1,
        title: String(item.title),
        link: safeLink(item.link),
        source: String(item.source || 'مصدر اقتصادي'),
        time: String(item.time || 'اليوم'),
        description: String(item.description || item.summary || item.content || ''),
        category: detectCategory(item.title)
    }));
}

function renderNews() {
    const filtered = currentFilter === 'all'
        ? newsData
        : newsData.filter(item => item.category === currentFilter);

    renderNewsGrid(filtered);
    renderFeatured(filtered.slice(0, 3));
    renderAnalysis(filtered);
    setText('newsCounter', `${filtered.length} خبر`);
    setText('lastUpdate', `آخر تحديث: ${new Date().toLocaleTimeString('ar-EG')}`);
}

function renderNewsGrid(items) {
    const container = document.getElementById('newsGrid');
    if (!container) return;
    if (!items.length) {
        container.innerHTML = '<div class="news-empty"><div class="empty-icon">📭</div><p>لا توجد أخبار متاحة في هذا التصنيف.</p></div>';
        return;
    }

    container.innerHTML = items.map((item, index) => `
        <article class="news-card fade-in" style="animation-delay:${index * 60}ms">
            <div class="news-header"><span class="news-category ${item.category}">${CATEGORY_NAMES[item.category]}</span><time class="news-time">${escapeHtml(item.time)}</time></div>
            <div class="news-body"><h3 class="news-title"><a href="news-detail.html?id=${item.id}" data-news-id="${item.id}">${escapeHtml(item.title)}</a></h3><p class="news-excerpt">${escapeHtml(item.description || 'اضغط لعرض تفاصيل الخبر ومصدره الأصلي.')}</p></div>
            <div class="news-footer"><span class="news-source">📰 ${escapeHtml(item.source)}</span><button class="news-share-btn" type="button" data-share-id="${item.id}" aria-label="مشاركة الخبر">🔗</button></div>
        </article>
    `).join('');

    container.querySelectorAll('[data-share-id]').forEach(button => {
        button.addEventListener('click', () => shareNews(Number(button.dataset.shareId)));
    });
    container.querySelectorAll('[data-news-id]').forEach(link => {
        link.addEventListener('click', () => {
            sessionStorage.setItem('selectedNews', JSON.stringify(newsData.find(item => item.id === Number(link.dataset.newsId)) || {}));
        });
    });
}

function renderFeatured(items) {
    const container = document.getElementById('featuredNews');
    if (!container) return;
    container.innerHTML = items.length
        ? `<div class="featured-grid">${items.map(item => `
            <article class="featured-card"><div class="featured-header"><span class="featured-badge">مميز</span><span class="featured-category">${CATEGORY_NAMES[item.category]}</span></div>
            <div class="featured-body"><h3 class="featured-title"><a href="news-detail.html?id=${item.id}" data-news-id="${item.id}">${escapeHtml(item.title)}</a></h3></div>
            <div class="featured-footer"><span class="featured-source">${escapeHtml(item.source)}</span><time class="featured-time">${escapeHtml(item.time)}</time></div></article>
        `).join('')}</div>`
        : '<div class="news-empty"><p>لا توجد أخبار مميزة حاليًا.</p></div>';

    container.querySelectorAll('[data-news-id]').forEach(link => {
        link.addEventListener('click', () => {
            sessionStorage.setItem('selectedNews', JSON.stringify(newsData.find(item => item.id === Number(link.dataset.newsId)) || {}));
        });
    });
}

function renderAnalysis(items) {
    const container = document.getElementById('newsAnalysis');
    if (!container) return;
    const counts = items.reduce((result, item) => {
        result[item.category] = (result[item.category] || 0) + 1;
        return result;
    }, {});
    const topCategory = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    container.innerHTML = `<div class="analysis-grid">
        <article class="analysis-item"><span class="analysis-icon">📰</span><strong class="analysis-value">${items.length}</strong><span class="analysis-label">إجمالي الأخبار</span></article>
        <article class="analysis-item"><span class="analysis-icon">📌</span><strong class="analysis-value">${topCategory ? CATEGORY_NAMES[topCategory[0]] : '—'}</strong><span class="analysis-label">التصنيف الأكثر حضورًا</span></article>
        <article class="analysis-item"><span class="analysis-icon">🕒</span><strong class="analysis-value">${items[0] ? escapeHtml(items[0].time) : '—'}</strong><span class="analysis-label">أحدث وقت منشور</span></article>
    </div>`;
}

function setFilter(filter) {
    currentFilter = filter;
    renderNews();
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

function safeLink(value) {
    try {
        const url = new URL(value || '#', window.location.href);
        return ['http:', 'https:'].includes(url.protocol) ? url.href : '#';
    } catch {
        return '#';
    }
}

function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[character]));
}

async function shareNews(id) {
    const item = newsData.find(news => news.id === id);
    if (!item) return;
    if (navigator.share) {
        await navigator.share({ title: item.title, text: item.title, url: item.link }).catch(() => {});
    } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(item.link);
        showNotification('تم نسخ رابط الخبر');
    }
}

function showNotification(message) {
    const element = document.getElementById('notification');
    if (!element) return;
    element.textContent = message;
    element.className = 'notification info';
    element.style.display = 'block';
    setTimeout(() => { element.style.display = 'none'; }, 2500);
}

function showError(message) {
    const container = document.getElementById('newsGrid');
    if (container) container.innerHTML = `<div class="news-error"><p>${message}</p></div>`;
}

window.NewsPage = { loadNewsData, renderNews, setFilter, shareNews };
