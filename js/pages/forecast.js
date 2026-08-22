// js/pages/forecast.js
// صفحة توقعات الذكاء الاصطناعي - تحليل السوق وتوقعات الأسعار

import CONFIG from '../config.js';

// ==================== المتغيرات ====================
let forecastData = {};
let autoRefreshInterval = null;
let marketMetrics = {};
let activeSection = 'metrics';
const REFRESH_INTERVAL = 60000; // 60 ثانية

// ==================== التهيئة ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🤖 AI Forecast page initialized');
    initForecastPage();
});

/**
 * تهيئة صفحة التوقعات
 */
function initForecastPage() {
    // إضافة مستمعين للأحداث
    setupForecastEventListeners();
    setupForecastSidebar();
    
    // تحميل البيانات الأولية
    loadForecastData();
    
    // بدء التحديث التلقائي
    startForecastAutoRefresh();
    
    // تحديث وقت التحديث
    updateLastUpdateTime();
}

function setupForecastSidebar() {
    document.querySelectorAll('[data-forecast-section]').forEach(link => {
        link.addEventListener('click', event => {
            event.preventDefault();
            document.querySelectorAll('[data-forecast-section]').forEach(item => {
                item.parentElement?.classList.toggle('active', item === link);
            });
            showForecastSection(link.dataset.forecastSection);
            window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        });
    });
    showForecastSection(activeSection, false);
}

function showForecastSection(sectionId, reset = true) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    activeSection = sectionId;
    document.querySelectorAll('.forecast-section').forEach(item => {
        item.classList.toggle('is-hidden', item !== section);
    });
    document.querySelectorAll('[data-forecast-section]').forEach(item => {
        item.parentElement?.classList.toggle('active', item.dataset.forecastSection === sectionId);
    });
    if (reset) window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
}

// ==================== تحميل البيانات ====================

/**
 * تحميل بيانات التوقعات
 */
async function loadForecastData() {
    try {
        const localData = window.AT?.appData?.forecastData;
        const localForecast = parseForecastData(localData);
        if (hasForecastData(localForecast)) {
            forecastData = localForecast;
            renderForecast();
            return;
        }
        
        // إذا لم توجد بيانات، جلبها من API
        const response = await fetch(CONFIG.API_URL, {
            method: 'GET',
            headers: {
                'X-My-App-Auth': CONFIG.API_SECRET_KEY,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const remoteForecast = parseForecastData(data.forecastData ?? data.forecast);
            if (hasForecastData(remoteForecast)) {
                forecastData = remoteForecast;
                renderForecast();
            } else {
                showErrorMessage('لا توجد بيانات توقعات متاحة حاليًا.');
            }
        } else {
            showErrorMessage('تعذر تحميل توقعات الذكاء الاصطناعي. يرجى المحاولة مرة أخرى.');
        }
    } catch (error) {
        console.error('Error loading forecast data:', error);
        showErrorMessage('حدث خطأ في الاتصال بالخادم.');
    }
}

function hasForecastData(data) {
    return Boolean(data?.metrics && data?.insights && Object.keys(data.metrics).length + Object.keys(data.insights).length > 0);
}

/**
 * تحليل بيانات التوقعات
 */
function parseForecastData(data) {
    if (typeof data === 'string') {
        try {
            data = JSON.parse(data);
        } catch {
            return {};
        }
    }
    
    if (!data || typeof data !== 'object') return {};
    data = data.forecastData || data.forecast || data.data || data.payload || data;
    if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch { return {}; }
    }
    
    return {
        metrics: data.metrics || {},
        insights: data.insights || {},
        updatedAt: data.updatedAt || new Date().toLocaleTimeString('ar-EG')
    };
}

// ==================== عرض التوقعات ====================

/**
 * عرض التوقعات
 */
function renderForecast() {
    renderMetricsCards();
    renderMarketInsights();
    renderSentimentAnalysis();
    renderRecommendations();
    renderMarketSignals();
    updateConfidence();
    updateForecastTime();
}

function updateConfidence() {
    const confidence = Number.parseFloat(forecastData.metrics?.confidence ?? '85') || 85;
    const bounded = Math.max(0, Math.min(100, confidence));
    const fill = document.getElementById('confidenceFill');
    const value = document.getElementById('confidenceValue');
    if (fill) fill.style.width = `${bounded}%`;
    if (value) value.textContent = `${bounded.toFixed(0)}%`;
}

/**
 * عرض بطاقات المقاييس
 */
function renderMetricsCards() {
    const container = document.getElementById('metricsCards');
    if (!container) return;
    
    const metrics = forecastData.metrics || {};
    const insights = forecastData.insights || {};
    
    const cards = [
        {
            title: 'تحليل الأخبار',
            value: metrics.analyzedNewsCount || 0,
            sub: `الأخبار المحللة`,
            icon: '📰',
            color: '#3498db'
        },
        {
            title: 'مؤشر المشاعر',
            value: metrics.sentimentScore || '0%',
            sub: 'مشاعر السوق',
            icon: '😊',
            color: getSentimentColor(metrics.sentimentScore)
        },
        {
            title: 'سعر الذهب',
            value: metrics.goldLivePrice || '—',
            sub: 'سعر لحظي',
            icon: '🥇',
            color: '#f1c40f'
        },
        {
            title: 'سعر البتكوين',
            value: metrics.btcLivePrice || '—',
            sub: 'سعر لحظي',
            icon: '₿',
            color: '#f7931a'
        },
        {
            title: 'سعر الدولار',
            value: metrics.usdPrice || '—',
            sub: 'السعر الرسمي',
            icon: '💵',
            color: '#2ecc71'
        },
        {
            title: 'آخر تحديث',
            value: forecastData.updatedAt || '—',
            sub: 'وقت التحديث',
            icon: '🕐',
            color: '#95a5a6'
        }
    ];
    
    let html = '<div class="metrics-grid">';
    
    cards.forEach((card, index) => {
        const delay = index * 100;
        html += `
            <div class="metric-card fade-in" style="animation-delay: ${delay}ms">
                <div class="metric-icon" style="background-color: ${card.color}20; color: ${card.color}">
                    ${card.icon}
                </div>
                <div class="metric-content">
                    <h3 class="metric-title">${card.title}</h3>
                    <div class="metric-value" style="color: ${card.color}">${card.value}</div>
                    <div class="metric-sub">${card.sub}</div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

/**
 * عرض رؤى السوق
 */
function renderMarketInsights() {
    const container = document.getElementById('marketInsights');
    if (!container) return;
    
    const insights = forecastData.insights || {};
    
    const items = [
        {
            title: 'نظرة عامة على السوق',
            value: insights.marketOverview || 'لا توجد قراءة حقيقية متاحة حاليًا.',
            icon: '📊',
            color: '#3498db'
        },
        {
            title: 'توقعات الذهب',
            value: insights.goldOutlook || 'لا توجد قراءة حقيقية متاحة حاليًا.',
            icon: '🥇',
            color: '#f1c40f'
        },
        {
            title: 'توقعات العملات الرقمية',
            value: insights.cryptoOutlook || 'لا توجد قراءة حقيقية متاحة حاليًا.',
            icon: '₿',
            color: '#f7931a'
        }
    ];
    
    let html = '<div class="insights-container">';
    
    items.forEach((item, index) => {
        const delay = index * 100;
        html += `
            <div class="insight-card fade-in" style="animation-delay: ${delay}ms">
                <div class="insight-header">
                    <span class="insight-icon" style="color: ${item.color}">${item.icon}</span>
                    <h4 class="insight-title">${item.title}</h4>
                </div>
                <p class="insight-value">${item.value}</p>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

/**
 * عرض تحليل المشاعر
 */
function renderSentimentAnalysis() {
    const container = document.getElementById('sentimentAnalysis');
    if (!container) return;
    
    const metrics = forecastData.metrics || {};
    const sentimentScore = metrics.sentimentScore || '0%';
    const scoreNum = parseFloat(sentimentScore) || 0;
    const analyzedNews = metrics.analyzedNewsCount || 0;
    
    // تحديد مستوى المشاعر
    let level, emoji, color, description;
    if (scoreNum > 20) {
        level = 'إيجابي جداً';
        emoji = '😊';
        color = '#2ecc71';
        description = 'مشاعر إيجابية قوية في السوق، تدفقات شراء متوقعة';
    } else if (scoreNum > 5) {
        level = 'إيجابي';
        emoji = '🙂';
        color = '#27ae60';
        description = 'مشاعر إيجابية معتدلة، تفاؤل في الأسواق';
    } else if (scoreNum > -5) {
        level = 'محايد';
        emoji = '😐';
        color = '#f39c12';
        description = 'مشاعر متوازنة، ترقب وحذر';
    } else if (scoreNum > -20) {
        level = 'سلبي';
        emoji = '😟';
        color = '#e67e22';
        description = 'مشاعر سلبية معتدلة، ضغوط بيع محتملة';
    } else {
        level = 'سلبي جداً';
        emoji = '😰';
        color = '#e74c3c';
        description = 'مشاعر سلبية قوية، حالة من الخوف في السوق';
    }
    
    const html = `
        <div class="sentiment-container">
            <div class="sentiment-header">
                <h3>📊 تحليل المشاعر</h3>
                <span class="sentiment-count">${analyzedNews} خبر محلل</span>
            </div>
            <div class="sentiment-gauge">
                <div class="gauge-circle">
                    <div class="gauge-value" style="color: ${color}">
                        ${emoji} ${level}
                    </div>
                    <div class="gauge-number">${sentimentScore}</div>
                </div>
                <div class="gauge-bar-container">
                    <div class="gauge-bar">
                        <div class="gauge-fill" style="width: ${(scoreNum + 50)}%; background-color: ${color};"></div>
                    </div>
                    <div class="gauge-labels">
                        <span>سلبي</span>
                        <span>محايد</span>
                        <span>إيجابي</span>
                    </div>
                </div>
            </div>
            <div class="sentiment-description" style="color: ${color}">
                ${description}
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

/**
 * عرض التوصيات الذكية
 */
function renderRecommendations() {
    const container = document.getElementById('recommendationsContent');
    if (!container) return;
    
    const insights = forecastData.insights || {};
    const recommendation = insights.smartRecommendation || 'لا توجد توصية مولدة من بيانات حقيقية حاليًا.';
    
    // تحليل التوصية إلى نقاط
    const points = extractRecommendationPoints(recommendation);
    
    let html = `
        <div class="recommendations-container">
            <div class="recommendations-header">
                <h3>💡 التوصية الذكية</h3>
                <span class="recommendation-badge">AI</span>
            </div>
            <div class="recommendation-main">
                <p class="recommendation-text">${recommendation}</p>
            </div>
    `;
    
    if (points.length > 0) {
        html += `
            <div class="recommendation-points">
                <h4>نقاط التوصية:</h4>
                <ul>
        `;
        points.forEach(point => {
            html += `<li>${point}</li>`;
        });
        html += `
                </ul>
            </div>
        `;
    }
    
    // إضافة إشارات السوق
    html += `
        <div class="market-signals">
            <div class="signal-item">
                <span class="signal-icon">📈</span>
                <span class="signal-label">إشارة الشراء</span>
                <span class="signal-value ${getSignalStatus(recommendation, 'buy')}">${getSignalStatusText(recommendation, 'buy')}</span>
            </div>
            <div class="signal-item">
                <span class="signal-icon">📉</span>
                <span class="signal-label">إشارة البيع</span>
                <span class="signal-value ${getSignalStatus(recommendation, 'sell')}">${getSignalStatusText(recommendation, 'sell')}</span>
            </div>
            <div class="signal-item">
                <span class="signal-icon">⚖️</span>
                <span class="signal-label">المخاطرة</span>
                <span class="signal-value ${getRiskLevel(recommendation)}">${getRiskLevelText(recommendation)}</span>
            </div>
        </div>
    `;
    
    html += `
            <div class="recommendation-footer">
                <span class="ai-disclaimer">⚠️ هذه التوصيات مبنية على تحليل البيانات المتاحة وقد لا تكون دقيقة 100%</span>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

function renderMarketSignals() {
    const container = document.getElementById('marketSignals');
    if (!container) return;
    const insights = forecastData.insights || {};
    const recommendation = insights.smartRecommendation || '';
    container.innerHTML = `<div class="signals-grid">
        <article class="signal-card"><span class="signal-icon">📈</span><strong class="signal-value">${getSignalStatusText(recommendation, 'buy')}</strong><span class="signal-label">اتجاه الشراء</span></article>
        <article class="signal-card"><span class="signal-icon">📉</span><strong class="signal-value">${getSignalStatusText(recommendation, 'sell')}</strong><span class="signal-label">اتجاه البيع</span></article>
        <article class="signal-card"><span class="signal-icon">⚖️</span><strong class="signal-value">${getRiskLevelText(recommendation)}</strong><span class="signal-label">مستوى المخاطرة</span></article>
    </div>`;
}

// ==================== دوال مساعدة ====================

/**
 * الحصول على لون المشاعر
 */
function getSentimentColor(score) {
    if (!score) return '#95a5a6';
    const num = parseFloat(score) || 0;
    if (num > 20) return '#2ecc71';
    if (num > 5) return '#27ae60';
    if (num > -5) return '#f39c12';
    if (num > -20) return '#e67e22';
    return '#e74c3c';
}

/**
 * استخراج نقاط التوصية
 */
function extractRecommendationPoints(text) {
    const points = [];
    const sentences = text.split(/[.،،\n]/);
    
    sentences.forEach(sentence => {
        sentence = sentence.trim();
        if (sentence.length > 10) {
            points.push(sentence);
        }
    });
    
    return points.slice(0, 5);
}

/**
 * الحصول على حالة الإشارة
 */
function getSignalStatus(text, type) {
    const lower = text.toLowerCase();
    if (type === 'buy') {
        if (/شراء|اقتناص|فرص|دعم/i.test(lower)) return 'strong';
        if (/ترقب|انتظار|متابعة/i.test(lower)) return 'neutral';
        return 'weak';
    } else {
        if (/بيع|هبوط|خسائر/i.test(lower)) return 'strong';
        if (/ترقب|انتظار|متابعة/i.test(lower)) return 'neutral';
        return 'weak';
    }
}

/**
 * الحصول على نص حالة الإشارة
 */
function getSignalStatusText(text, type) {
    const status = getSignalStatus(text, type);
    const texts = {
        'strong': '🟢 قوي',
        'neutral': '🟡 محايد',
        'weak': '🔴 ضعيف'
    };
    return texts[status] || '⚪ غير محدد';
}

/**
 * الحصول على مستوى المخاطرة
 */
function getRiskLevel(text) {
    const lower = text.toLowerCase();
    if (/حذر|مخاطر|تريث|انتظار/i.test(lower)) return 'high';
    if (/متابعة|ترقب|مرحلي/i.test(lower)) return 'medium';
    return 'low';
}

/**
 * الحصول على نص مستوى المخاطرة
 */
function getRiskLevelText(text) {
    const level = getRiskLevel(text);
    const texts = {
        'high': '🔴 مرتفعة',
        'medium': '🟡 متوسطة',
        'low': '🟢 منخفضة'
    };
    return texts[level] || '⚪ غير محدد';
}

// ==================== التحديث التلقائي ====================

/**
 * بدء التحديث التلقائي
 */
function startForecastAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    
    autoRefreshInterval = setInterval(() => {
        if (document.visibilityState === 'visible' && navigator.onLine) {
            loadForecastData();
        }
    }, REFRESH_INTERVAL);
}

/**
 * تحديث وقت آخر تحديث
 */
function updateLastUpdateTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('ar-EG', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    const lastUpdate = document.getElementById('last-update');
    if (lastUpdate) {
        lastUpdate.textContent = `آخر تحديث: ${timeStr}`;
    }
}

/**
 * تحديث وقت الصفحة
 */
function updateForecastTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('ar-EG', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    const forecastTime = document.getElementById('forecast-time');
    if (forecastTime) {
        forecastTime.textContent = `🕐 ${timeStr}`;
    }
}

// تحديث الوقت
setInterval(updateLastUpdateTime, 1000);
setInterval(updateForecastTime, 1000);

// ==================== مستمعين الأحداث ====================

/**
 * إعداد مستمعين الأحداث
 */
function setupForecastEventListeners() {
    // زر التحديث
    const refreshBtn = document.getElementById('refresh-forecast');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            this.classList.add('spinning');
            loadForecastData();
            setTimeout(() => this.classList.remove('spinning'), 1000);
        });
    }
    
    // استماع لأحداث تحميل البيانات
    document.addEventListener('dataLoaded', function(e) {
        const sharedForecast = parseForecastData(e.detail?.forecastData);
        if (hasForecastData(sharedForecast)) {
            forecastData = sharedForecast;
            renderForecast();
        }
    });
}

// ==================== دوال مساعدة ====================

/**
 * عرض رسالة خطأ
 */
function showErrorMessage(message) {
    const container = document.getElementById('metricsCards');
    if (container) {
        container.innerHTML = `
            <div class="error-container">
                <div class="error-icon">⚠️</div>
                <p>${message}</p>
                <button onclick="loadForecastData()" class="retry-btn">إعادة المحاولة</button>
            </div>
        `;
    }
}

// ==================== تصدير الدوال ====================

window.ForecastPage = {
    loadForecastData,
    renderForecast,
    forecastData
};

console.log('🤖 AI Forecast page module loaded successfully');



