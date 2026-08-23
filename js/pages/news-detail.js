import { fetchMarketData } from '../modules/api.js';

const CATEGORY_NAMES = {
    metals: '💎 معادن',
    oil: '🛢️ نفط',
    forex: '💱 عملات',
    crypto: '₿ عملات رقمية',
    economy: '📊 اقتصاد',
    stocks: '📈 أسهم',
    general: '📰 عام'
};

document.addEventListener(
    'DOMContentLoaded',
    loadNewsDetail
);


/* =========================================================
   تحميل تفاصيل الخبر
========================================================= */

async function loadNewsDetail() {

    const container =
        document.getElementById('newsDetail');

    if (!container) return;

    const requestedId =
        new URLSearchParams(
            window.location.search
        ).get('id');

    console.log(
        '🔎 Requested news ID:',
        requestedId
    );


    /*
     * =====================================================
     * 1. محاولة الحصول على الخبر من sessionStorage
     * =====================================================
     */

    const storedItem =
        readStoredNews();

    if (
        storedItem?.title &&
        (
            !requestedId ||
            String(storedItem.id) ===
            String(requestedId)
        )
    ) {

        console.log(
            '✅ News loaded from sessionStorage'
        );

        await renderDetail(
            container,
            normalizeNewsItem(storedItem)
        );

        return;
    }


    /*
     * =====================================================
     * 2. جلب الأخبار من API
     * =====================================================
     */

    try {

        const data =
            await fetchMarketData();

        console.log(
            '📰 News Detail - API Data:',
            data
        );


        /*
         * api.js يعيد newsData
         */
        const items =
            normalizeNews(
                data?.newsData ??
                data?.news ??
                data?.articles ??
                data?.results ??
                []
            );


        console.log(
            '📰 News Detail - Normalized News:',
            items
        );


        /*
         * البحث عن الخبر
         */
        const item =
            findNewsItem(
                items,
                requestedId
            );


        console.log(
            '🔎 Selected news item:',
            item
        );


        if (!item?.title) {

            throw new Error(
                'News item not found'
            );
        }


        /*
         * عرض الخبر
         */
        await renderDetail(
            container,
            item
        );


    } catch (error) {

        console.error(
            '❌ News detail error:',
            error
        );


        /*
         * =================================================
         * 3. محاولة أخيرة من sessionStorage
         * =================================================
         */

        const fallback =
            readStoredNews();


        if (
            fallback?.title &&
            (
                !requestedId ||
                String(fallback.id) ===
                String(requestedId)
            )
        ) {

            console.log(
                '⚠️ Using sessionStorage fallback'
            );

            await renderDetail(
                container,
                normalizeNewsItem(fallback)
            );

        } else {

            container.innerHTML = `

                <div class="news-empty">

                    <i class="fas fa-newspaper"></i>

                    <p>
                        تعذر تحميل تفاصيل الخبر.
                    </p>

                    <a href="news.html">

                        <i class="fas fa-arrow-right"></i>

                        العودة إلى الأخبار

                    </a>

                </div>

            `;
        }
    }
}


/* =========================================================
   البحث عن الخبر
========================================================= */

function findNewsItem(
    items,
    requestedId
) {

    if (!Array.isArray(items)) {
        return null;
    }


    /*
     * إذا لم يوجد ID
     * نعيد أول خبر
     */
    if (!requestedId) {

        return items[0] || null;
    }


    const id =
        String(requestedId);


    /*
     * البحث بواسطة id
     */
    let item =
        items.find(
            news =>
                String(news.id) === id
        );


    if (item) {
        return item;
    }


    /*
     * البحث بواسطة article_id
     */
    item =
        items.find(
            news =>
                String(news.article_id || '') === id
        );


    if (item) {
        return item;
    }


    /*
     * البحث بواسطة الرابط
     */
    item =
        items.find(
            news =>
                String(news.link || '') === id
        );


    return item || null;
}


/* =========================================================
   قراءة الخبر المحفوظ
========================================================= */

function readStoredNews() {

    try {

        return JSON.parse(
            sessionStorage.getItem(
                'selectedNews'
            ) || 'null'
        );

    } catch {

        return null;
    }
}


/* =========================================================
   تطبيع الأخبار
========================================================= */

function normalizeNews(value) {

    let data = value;


    /*
     * إذا كانت String
     */
    if (typeof data === 'string') {

        try {

            data = JSON.parse(data);

        } catch {

            return [];
        }
    }


    /*
     * معالجة الحالات التي تأتي فيها الأخبار
     * داخل object
     */
    if (
        !Array.isArray(data) &&
        data &&
        typeof data === 'object'
    ) {

        data =
            data.newsData ??
            data.news ??
            data.articles ??
            data.results ??
            data.data ??
            [];
    }


    /*
     * إذا أصبحت String مرة أخرى
     */
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

        .filter(
            item =>
                item &&
                item.title
        )

        .map(
            (item, index) =>
                normalizeNewsItem(
                    item,
                    index
                )
        );
}


/* =========================================================
   تطبيع خبر واحد
========================================================= */

function normalizeNewsItem(
    item,
    index = 0
) {

    if (!item) {
        return null;
    }


    /* =====================================================
       Article ID
    ===================================================== */

    const articleId =
        item.article_id ??
        item.articleId ??
        '';


    /* =====================================================
       ID
    ===================================================== */

    const id =
        item.id ??
        articleId ??
        item.link ??
        `news-${index + 1}`;


    /* =====================================================
       التاريخ
    ===================================================== */

    const publishedAt =
        item.pubDate ??
        item.pub_date ??
        item.publishedAt ??
        item.published_at ??
        item.date ??
        '';


    /* =====================================================
       الصورة
    ===================================================== */

    const image =
        item.image_url ??
        item.image ??
        item.urlToImage ??
        '';


    /* =====================================================
       الرابط
    ===================================================== */

    const link =
        item.link ??
        item.url ??
        item.source_url ??
        '';


    /* =====================================================
       المصدر
    ===================================================== */

    const source =
        item.source_name ??
        item.source ??
        item.source_id ??
        'مصدر اقتصادي';


    /* =====================================================
       الوصف
       
       مهم جدًا:
       لا تحذف هذا المتغير.
    ===================================================== */

    const description =
        item.description ??
        item.summary ??
        '';


    /* =====================================================
       المقال الحقيقي
       
       هنا لا نستخدم description كبديل.
       لأن description سيتم عرضه منفصلًا.
    ===================================================== */

    let article = '';

    if (
        item.content &&
        !String(item.content).includes('ONLY AVAILABLE')
    ) {

        article = item.content;

    } else if (item.article) {

        article = item.article;

    } else if (item.body) {

        article = item.body;

    } else if (item.details) {

        article = item.details;

    }


    /* =====================================================
       النتيجة
    ===================================================== */

    return {

        id: String(id),

        article_id:
            String(articleId || ''),

        title:
            String(
                item.title || ''
            ),

        link:
            safeLink(link),

        source:
            String(source),

        time:
            formatNewsTime(
                publishedAt
            ),

        date:
            formatNewsDate(
                publishedAt
            ),

        publishedAt:
            String(
                publishedAt || ''
            ),

        image:
            safeImage(image),

        description:
            String(
                description || ''
            ),

        article:
            String(
                article || ''
            ),

        category:
            normalizeCategory(
                item.category,
                item.title
            )
    };
}


/* =========================================================
   تنسيق وقت الخبر
========================================================= */

function formatNewsTime(value) {

    if (!value) {
        return 'اليوم';
    }


    try {

        const date =
            new Date(value);


        if (Number.isNaN(date.getTime())) {
            return String(value);
        }


        return date.toLocaleTimeString(
            'ar-EG',
            {
                hour: '2-digit',
                minute: '2-digit'
            }
        );

    } catch {

        return String(value);
    }
}


/* =========================================================
   تنسيق تاريخ الخبر
========================================================= */

function formatNewsDate(value) {

    if (!value) {
        return '';
    }


    try {

        const date =
            new Date(value);


        if (Number.isNaN(date.getTime())) {
            return String(value);
        }


        return date.toLocaleDateString(
            'ar-EG',
            {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }
        );

    } catch {

        return String(value);
    }
}


/* =========================================================
   عرض التفاصيل
========================================================= */

async function renderDetail(
    container,
    item
) {

    if (!item?.title) {

        throw new Error(
            'Invalid news item'
        );
    }


    /* =====================================================
       المقال الحقيقي
    ===================================================== */

    const article =
        getArticleText(item);


    /* =====================================================
       الصورة
    ===================================================== */

    const imageHtml =
        item.image
            ? `

                <div class="detail-image-wrapper">

                    <img
                        class="detail-image"
                        src="${escapeHtml(item.image)}"
                        alt="${escapeHtml(item.title)}"
                        loading="eager"
                        referrerpolicy="no-referrer"
                        onerror="
                            this.parentElement.style.display='none';
                        "
                    >

                </div>

            `
            : `

                <div
                    class="
                        detail-image-wrapper
                        detail-image-placeholder
                    "
                >

                    <i class="fas fa-newspaper"></i>

                </div>

            `;


    /* =====================================================
       محتوى الخبر
       
       إذا يوجد مقال حقيقي:
       نعرض المقال.

       إذا لا يوجد مقال:
       نعرض description مرة واحدة فقط.
    ===================================================== */

    let contentHtml = '';


    if (article) {

        contentHtml = `

            <div class="article-text">

                ${article}

            </div>

        `;

    } else if (
        item.description &&
        item.description.trim()
    ) {

        contentHtml = `

            <div class="article-text">

                ${escapeHtml(
                    item.description
                )}

            </div>

        `;

    } else {

        contentHtml = `

            <div class="article-empty">

                <i
                    class="fas fa-file-circle-xmark"
                ></i>

                <p>
                    لم يتمكن مصدر الأخبار من توفير
                    نص المقالة.
                </p>

                <p>
                    يمكنك قراءة الخبر كاملًا
                    من المصدر الأصلي.
                </p>

            </div>

        `;
    }


    /* =====================================================
       بناء الصفحة
    ===================================================== */

    container.innerHTML = `

        <!-- التصنيف والوقت -->

        <div class="detail-meta">

            <span
                class="
                    news-category
                    ${escapeHtml(
                        item.category || 'general'
                    )}
                "
            >

                ${
                    CATEGORY_NAMES[item.category]
                    ||
                    CATEGORY_NAMES.general
                }

            </span>


            ${
                item.time
                    ? `

                        <time>

                            ${escapeHtml(
                                item.time
                            )}

                        </time>

                    `
                    : ''
            }

        </div>


        <!-- الصورة -->

        ${imageHtml}


        <!-- العنوان -->

        <h2 class="detail-title">

            ${escapeHtml(
                item.title
            )}

        </h2>


        <!-- المصدر -->

        ${
            item.source
                ? `

                    <div class="detail-source">

                        <i
                            class="fas fa-building"
                        ></i>

                        <span>
                            الناشر:
                        </span>

                        ${escapeHtml(
                            item.source
                        )}

                    </div>

                `
                : ''
        }


        <!-- التاريخ -->

        ${
            item.date
                ? `

                    <time
                        class="detail-date"
                    >

                        ${escapeHtml(
                            item.date
                        )}

                    </time>

                `
                : ''
        }


        <!-- محتوى الخبر -->

        <div class="detail-content">

            ${contentHtml}

        </div>


        <!-- تنبيه -->

        <p class="detail-disclaimer">

            الخبر منقول من المصدر الأصلي،
            وقد تختلف تفاصيله أو تتحدث
            بعد آخر تحديث.

        </p>


        <!-- رابط المصدر -->

        ${
            item.link &&
            item.link !== '#'
                ? `

                    <a
                        class="detail-source-button"
                        href="${escapeHtml(
                            item.link
                        )}"
                        target="_blank"
                        rel="noopener noreferrer"
                    >

                        <i
                            class="
                                fas
                                fa-external-link-alt
                            "
                        ></i>

                        قراءة الخبر كاملًا
                        من موقع الناشر

                    </a>

                `
                : ''
        }

    `;
}


/* =========================================================
   نص المقال
========================================================= */

function getArticleText(item) {

    const text =
        item.article ||
        '';

    if (
        !text ||
        !String(text).trim()
    ) {

        return '';
    }

    return escapeHtml(
        text
    ).replace(
        /\r?\n/g,
        '<br><br>'
    );
}


/* =========================================================
   التصنيف
========================================================= */

function normalizeCategory(
    category,
    title
) {

    let value = category;


    /*
     * NewsData يمكن أن يعيد category كمصفوفة
     */
    if (Array.isArray(value)) {
        value = value[0];
    }


    value =
        String(value || '')
            .toLowerCase()
            .trim();


    if (
        value === 'اقتصادي' ||
        value === 'اقتصاد' ||
        value === 'economy' ||
        value === 'business'
    ) {

        return 'economy';
    }


    if (
        value === 'metals'
    ) {

        return 'metals';
    }


    if (
        value === 'oil' ||
        value === 'energy'
    ) {

        return 'oil';
    }


    if (
        value === 'forex' ||
        value === 'currency'
    ) {

        return 'forex';
    }


    if (
        value === 'crypto'
    ) {

        return 'crypto';
    }


    if (
        value === 'stocks' ||
        value === 'stock'
    ) {

        return 'stocks';
    }


    if (
        value === 'general' ||
        value === 'top'
    ) {

        return 'general';
    }


    return detectCategory(title);
}


/* =========================================================
   اكتشاف التصنيف
========================================================= */

function detectCategory(title) {

    const text =
        String(title || '')
            .toLowerCase();


    if (
        /ذهب|فضة|بلاتين|معادن|gold|silver|platinum|metal/
            .test(text)
    ) {

        return 'metals';
    }


    if (
        /نفط|بترول|غاز|طاقة|oil|gas|energy|crude/
            .test(text)
    ) {

        return 'oil';
    }


    if (
        /دولار|يورو|جنيه|ين|عملات|سعر الصرف|currency|forex|dollar|euro/
            .test(text)
    ) {

        return 'forex';
    }


    if (
        /بتكوين|بيتكوين|إيثيريوم|اثيريوم|عملات رقمية|crypto|bitcoin|ethereum/
            .test(text)
    ) {

        return 'crypto';
    }


    if (
        /أسهم|سهم|بورصة|مؤشر|تداول|stock|stocks|share|market index/
            .test(text)
    ) {

        return 'stocks';
    }


    if (
        /اقتصاد|اقتصادي|تضخم|فائدة|نمو|بطالة|أسعار المستهلك|inflation|interest rate|economy|economic|growth|unemployment/
            .test(text)
    ) {

        return 'economy';
    }


    return 'general';
}


/* =========================================================
   الصور
========================================================= */

function safeImage(value) {

    if (
        !value ||
        typeof value !== 'string'
    ) {

        return '';
    }


    const cleaned =
        value.trim();


    if (!cleaned) {
        return '';
    }


    try {

        const url =
            new URL(
                cleaned,
                window.location.href
            );


        if (
            !['http:', 'https:']
                .includes(url.protocol)
        ) {

            return '';
        }


        return url.href;

    } catch {

        return '';
    }
}


/* =========================================================
   الروابط
========================================================= */

function safeLink(value) {

    if (
        !value ||
        typeof value !== 'string'
    ) {

        return '#';
    }


    try {

        const url =
            new URL(
                value.trim(),
                window.location.href
            );


        return [
            'http:',
            'https:'
        ].includes(url.protocol)
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
   نهاية الموديول
========================================================= */

console.log(
    '✅ News detail module loaded'
);

