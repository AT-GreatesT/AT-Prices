import { fetchMarketData, refreshData } from '../modules/api.js';

const REFRESH_INTERVAL = 180000; // 3 دقائق

let newsData = [];
let currentFilter = 'all';
let refreshTimer = null;
let isLoadingNews = false;
let lastRequestId = 0;

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

    refreshTimer = setInterval(() => {
        loadNewsData();
    }, REFRESH_INTERVAL);

    document
        .getElementById('refreshBtn')
        ?.addEventListener('click', () => {
            loadNewsData(true);
        });

    // استقبال البيانات الموحدة من api.js
    document.addEventListener('dataLoaded', event => {
        const normalized = normalizeNews(event.detail?.newsData);

        if (normalized.length) {
            newsData = normalized;
            renderNews();
        }
    });

    // روابط أقسام الأخبار
    document.querySelectorAll('[data-news-section]').forEach(link => {
        link.addEventListener('click', event => {
            event.preventDefault();

            const section = link.dataset.newsSection;

            if (section === 'analysis') {
                setFilter('all');

                window.scrollTo({
                    top: 0,
                    left: 0,
                    behavior: 'auto'
                });

                document
                    .getElementById('analysis')
                    ?.classList.add('news-section-focus');

            } else {
                setFilter(section);

                window.scrollTo({
                    top: 0,
                    left: 0,
                    behavior: 'auto'
                });
            }

            document
                .querySelectorAll('[data-news-section]')
                .forEach(item => {
                    item.parentElement?.classList.toggle(
                        'active',
                        item === link
                    );
                });
        });
    });

    // روابط تصفية الأخبار في Footer
    document
        .querySelectorAll('[data-filter]')
        .forEach(link => {
            link.addEventListener('click', event => {
                event.preventDefault();

                const filter = link.dataset.filter;

                if (filter) {
                    setFilter(filter);

                    window.scrollTo({
                        top: 0,
                        behavior: 'smooth'
                    });
                }
            });
        });
});


/* =========================================================
   تحميل الأخبار
========================================================= */

async function loadNewsData(forceRefresh = false) {
    if (isLoadingNews) return;

    const requestId = ++lastRequestId;
    isLoadingNews = true;

    try {
        const data = forceRefresh
            ? await refreshData()
            : await fetchMarketData();

        console.log('✅ Market Data:', data);
        console.log('📰 News Data:', data?.newsData);

        if (requestId !== lastRequestId) return;

        /*
         * api.js أصبح مسؤولاً عن تطبيع البيانات.
         * لذلك نأخذ الأخبار مباشرة من newsData.
         */
        const normalized = normalizeNews(data?.newsData);

        if (!normalized.length) {
            throw new Error('لا توجد أخبار في newsData');
        }

        newsData = normalized;

        // حفظ الأخبار للاستخدام في صفحة التفاصيل
        saveNewsCache(newsData);

        renderNews();

    } catch (error) {
        console.error('❌ News data error:', error);

        const cachedNews = readCachedNews();

        if (cachedNews.length) {
            newsData = cachedNews;
            renderNews();
        } else {
            showError('تعذر تحميل الأخبار حاليًا.');
        }

    } finally {
        isLoadingNews = false;
    }
}


/* =========================================================
   تخزين الأخبار
========================================================= */

function saveNewsCache(items) {
    try {
        sessionStorage.setItem(
            'at-financial-news',
            JSON.stringify(items)
        );
    } catch {
        // التخزين اختياري
    }
}


function readCachedNews() {
    try {
        const cached = JSON.parse(
            sessionStorage.getItem('at-financial-news') || '[]'
        );

        return normalizeNews(cached);

    } catch {
        return [];
    }
}


/* =========================================================
   تطبيع الأخبار
========================================================= */

function normalizeNews(value) {
    let data = value;

    if (typeof data === 'string') {
        try {
            data = JSON.parse(data);
        } catch {
            return [];
        }
    }

    if (!Array.isArray(data)) {
        return [];
    }

    return data
        .filter(item => item && item.title)
        .map((item, index) => ({
            id:
                item.id ??
                item.article_id ??
                item.link ??
                `news-${index + 1}`,

            title: String(item.title || ''),

            link: safeLink(
                item.link ||
                item.url ||
                item.source_url ||
                ''
            ),

            source: String(
                item.source ||
                item.source_name ||
                item.source_id ||
                'مصدر اقتصادي'
            ),

            time: String(
                item.time ||
                item.published_time ||
                'اليوم'
            ),

            date: String(
                item.date ||
                item.published_date ||
                ''
            ),

            publishedAt: String(
                item.publishedAt ||
                item.published_at ||
                ''
            ),

            image: safeImage(
                item.image_url ||
                item.image ||
                item.urlToImage ||
                ""
            ),

            description: String(
                item.description ||
                item.summary ||
                ''
            ),

            article: String(
                item.article ||
                item.content ||
                item.body ||
                item.details ||
                item.description ||
                ''
            ),

            category: normalizeCategory(
                item.category,
                item.title
            )
        }));
}


function normalizeCategory(category, title) {
    let value = category;

    // أحيانًا category تأتي كمصفوفة من API
    if (Array.isArray(value)) {
        value = value[0];
    }

    value = String(value || '')
        .toLowerCase()
        .trim();

    // التصنيفات العربية
    if (
        value === 'اقتصادي' ||
        value === 'اقتصاد' ||
        value === 'business' ||
        value === 'economy'
    ) {
        return 'economy';
    }

    if (
        value === 'معادن' ||
        value === 'metals'
    ) {
        return 'metals';
    }

    if (
        value === 'نفط' ||
        value === 'oil' ||
        value === 'energy'
    ) {
        return 'oil';
    }

    if (
        value === 'عملات' ||
        value === 'forex' ||
        value === 'currency'
    ) {
        return 'forex';
    }

    if (
        value === 'عملات رقمية' ||
        value === 'crypto'
    ) {
        return 'crypto';
    }

    if (
        value === 'أسهم' ||
        value === 'stocks' ||
        value === 'stock'
    ) {
        return 'stocks';
    }

    if (value === 'general') {
        return 'general';
    }

    /*
     * إذا لم يكن التصنيف واضحًا،
     * نحاول اكتشافه من عنوان الخبر.
     */
    return detectCategory(title);
}


function detectCategory(title) {
    const text = String(title || '')
        .toLowerCase()
        .trim();

    // الذهب والمعادن
    if (
        /ذهب|فضة|بلاتين|معادن|gold|silver|platinum|metal/.test(text)
    ) {
        return 'metals';
    }

    // النفط والطاقة
    if (
        /نفط|بترول|غاز|طاقة|oil|gas|energy|crude/.test(text)
    ) {
        return 'oil';
    }

    // العملات
    if (
        /دولار|يورو|جنيه|ين|عملات|سعر الصرف|currency|forex|dollar|euro/.test(text)
    ) {
        return 'forex';
    }

    // العملات الرقمية
    if (
        /بتكوين|بيتكوين|إيثيريوم|اثيريوم|عملات رقمية|crypto|bitcoin|ethereum/.test(text)
    ) {
        return 'crypto';
    }

    // الأسهم والبورصة
    if (
        /أسهم|سهم|بورصة|مؤشر|تداول|stock|stocks|share|market index/.test(text)
    ) {
        return 'stocks';
    }

    // الاقتصاد والتضخم والفائدة
    if (
        /اقتصاد|اقتصادي|تضخم|فائدة|نمو|بطالة|أسعار المستهلك|inflation|interest rate|economy|economic|growth|unemployment/.test(text)
    ) {
        return 'economy';
    }

    return 'general';
}


/* =========================================================
   عرض الأخبار
========================================================= */

function renderNews() {
    const filtered =
        currentFilter === 'all'
            ? newsData
            : newsData.filter(
                item => item.category === currentFilter
            );

    renderNewsGrid(filtered);

    renderFeatured(filtered.slice(0, 3));

    renderAnalysis(filtered);

    setText(
        'newsCounter',
        `${filtered.length} خبر`
    );
}


/* =========================================================
   شبكة الأخبار
========================================================= */

function renderNewsGrid(items) {
    const container = document.getElementById('newsGrid');

    if (!container) return;

    if (!items.length) {
        container.innerHTML = `
            <div class="news-empty">
                <div class="empty-icon">📭</div>
                <p>لا توجد أخبار متاحة في هذا التصنيف.</p>
            </div>
        `;

        return;
    }

    container.innerHTML = items
        .map((item, index) => {

            /*
             * صورة الخبر
             */
            const imageHtml = item.image
                ? `
                    <div class="news-card-image">
                        <img
                            src="${escapeHtml(item.image)}"
                            alt="${escapeHtml(item.title)}"
                            loading="lazy"
                            referrerpolicy="no-referrer"
                            onerror="
                                this.style.display='none';
                                this.parentElement.classList.add('image-error');
                            "
                        >

                        <div class="news-image-fallback">
                            <i class="fas fa-newspaper"></i>
                        </div>
                    </div>
                `
                : `
                    <div class="news-card-image news-image-placeholder">
                        <i class="fas fa-newspaper"></i>
                    </div>
                `;

            return `
                <article
                    class="news-card fade-in"
                    style="animation-delay:${index * 60}ms"
                >

                    ${imageHtml}

                    <div class="news-header">

                        <span class="news-category ${escapeHtml(item.category)}">
                            ${
                                CATEGORY_NAMES[item.category] ||
                                CATEGORY_NAMES.general
                            }
                        </span>

                        <time class="news-time">
                            ${escapeHtml(item.time)}
                        </time>

                    </div>

                    <div class="news-body">

                        <h3 class="news-title">

                            <a
                                href="news-detail.html?id=${encodeURIComponent(item.id)}"
                                data-news-id="${escapeHtml(item.id)}"
                            >
                                ${escapeHtml(item.title)}
                            </a>

                        </h3>

                        <p class="news-excerpt">
                            ${escapeHtml(
                                item.description ||
                                'اضغط لعرض تفاصيل الخبر ومصدره الأصلي.'
                            )}
                        </p>

                    </div>

                    <div class="news-footer">

                        <span class="news-source">
                            📰 ${escapeHtml(item.source)}
                        </span>

                        <button
                            class="news-share-btn"
                            type="button"
                            data-share-id="${escapeHtml(item.id)}"
                            aria-label="مشاركة الخبر"
                        >
                            🔗
                        </button>

                    </div>

                </article>
            `;
        })
        .join('');

    /*
     * مشاركة الخبر
     */
    container
        .querySelectorAll('[data-share-id]')
        .forEach(button => {

            button.addEventListener('click', () => {
                shareNews(button.dataset.shareId);
            });

        });

    /*
     * تخزين الخبر المختار
     */
    container
        .querySelectorAll('[data-news-id]')
        .forEach(link => {

            link.addEventListener('click', () => {

                const id = link.dataset.newsId;

                const item = newsData.find(
                    news =>
                        String(news.id) ===
                        String(id)
                );

                if (item) {
                    sessionStorage.setItem(
                        'selectedNews',
                        JSON.stringify(item)
                    );
                }

            });

        });
}


/* =========================================================
   الأخبار المميزة
========================================================= */

function renderFeatured(items) {
    const container =
        document.getElementById('featuredNews');

    if (!container) return;

    if (!items.length) {
        container.innerHTML = `
            <div class="news-empty">
                <p>لا توجد أخبار مميزة حاليًا.</p>
            </div>
        `;

        return;
    }

    container.innerHTML = `
        <div class="featured-grid">

            ${items.map(item => `

                <article class="featured-card">

                    <div class="featured-header">

                        <span class="featured-badge">
                            مميز
                        </span>

                        <span class="featured-category">
                            ${CATEGORY_NAMES[item.category] || CATEGORY_NAMES.general}
                        </span>

                    </div>

                    <div class="featured-body">

                        <h3 class="featured-title">

                            <a
                                href="news-detail.html?id=${encodeURIComponent(item.id)}"
                                data-news-id="${escapeHtml(item.id)}"
                            >
                                ${escapeHtml(item.title)}
                            </a>

                        </h3>

                    </div>

                    <div class="featured-footer">

                        <span class="featured-source">
                            ${escapeHtml(item.source)}
                        </span>

                        <time class="featured-time">
                            ${escapeHtml(item.time)}
                        </time>

                    </div>

                </article>

            `).join('')}

        </div>
    `;

    container
        .querySelectorAll('[data-news-id]')
        .forEach(link => {

            link.addEventListener('click', () => {

                const item = newsData.find(
                    news =>
                        String(news.id) ===
                        String(link.dataset.newsId)
                );

                if (item) {
                    sessionStorage.setItem(
                        'selectedNews',
                        JSON.stringify(item)
                    );
                }

            });

        });
}


/* =========================================================
   تحليل الأخبار
========================================================= */

function renderAnalysis(items) {
    const container =
        document.getElementById('newsAnalysis');

    if (!container) return;

    const counts = items.reduce(
        (result, item) => {

            result[item.category] =
                (result[item.category] || 0) + 1;

            return result;

        },
        {}
    );

    const topCategory =
        Object.entries(counts)
            .sort((a, b) => b[1] - a[1])[0];

    container.innerHTML = `
        <div class="analysis-grid">

            <article class="analysis-item">

                <span class="analysis-icon">
                    📰
                </span>

                <strong class="analysis-value">
                    ${items.length}
                </strong>

                <span class="analysis-label">
                    إجمالي الأخبار
                </span>

            </article>

            <article class="analysis-item">

                <span class="analysis-icon">
                    📌
                </span>

                <strong class="analysis-value">
                    ${
                        topCategory
                            ? CATEGORY_NAMES[topCategory[0]]
                            : '—'
                    }
                </strong>

                <span class="analysis-label">
                    التصنيف الأكثر حضورًا
                </span>

            </article>

            <article class="analysis-item">

                <span class="analysis-icon">
                    🕒
                </span>

                <strong class="analysis-value">
                    ${
                        items[0]
                            ? escapeHtml(items[0].time)
                            : '—'
                    }
                </strong>

                <span class="analysis-label">
                    أحدث وقت منشور
                </span>

            </article>

        </div>
    `;
}


/* =========================================================
   الفلترة
========================================================= */

function setFilter(filter) {
    currentFilter = filter || 'all';

    renderNews();
}


/* =========================================================
   الصور والروابط
========================================================= */

function safeImage(url) {
    if (!url || typeof url !== "string") {
        return "";
    }

    const value = url.trim();

    if (!value) {
        return "";
    }

    if (
        value.startsWith("https://") ||
        value.startsWith("http://")
    ) {
        return value;
    }

    return "";
}

function safeLink(value) {
    try {
        const url = new URL(
            value || '#',
            window.location.href
        );

        return ['http:', 'https:'].includes(url.protocol)
            ? url.href
            : '#';

    } catch {
        return '#';
    }
}


/* =========================================================
   حماية HTML
========================================================= */

function escapeHtml(value) {
    return String(value).replace(
        /[&<>'"]/g,
        character => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[character])
    );
}


/* =========================================================
   مشاركة الخبر
========================================================= */

async function shareNews(id) {
    const item = newsData.find(
        news => String(news.id) === String(id)
    );

    if (!item) return;

    const shareUrl =
        item.link && item.link !== '#'
            ? item.link
            : `${window.location.origin}/news-detail.html?id=${encodeURIComponent(item.id)}`;

    if (navigator.share) {

        await navigator.share({
            title: item.title,
            text: item.title,
            url: shareUrl
        }).catch(() => {});

    } else if (navigator.clipboard) {

        await navigator.clipboard
            .writeText(shareUrl)
            .catch(() => {});

        showNotification('تم نسخ رابط الخبر');
    }
}


/* =========================================================
   رسائل
========================================================= */

function showNotification(message) {
    const element =
        document.getElementById('notification');

    if (!element) return;

    element.textContent = message;

    element.className =
        'notification info';

    element.style.display = 'block';

    setTimeout(() => {
        element.style.display = 'none';
    }, 2500);
}


function showError(message) {
    const container =
        document.getElementById('newsGrid');

    if (!container) return;

    container.innerHTML = `
        <div class="news-error">
            <p>${escapeHtml(message)}</p>
        </div>
    `;
}


function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}


/* =========================================================
   API عام للصفحة
========================================================= */

window.NewsPage = {
    loadNewsData,
    renderNews,
    setFilter,
    shareNews
};

console.log('✅ News page module loaded');


