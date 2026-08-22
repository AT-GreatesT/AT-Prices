// js/pages/prices.js
// صفحة الأسعار المباشرة - عرض جميع الأسعار بالتفصيل

import CONFIG from '../config.js';
import { fetchMarketData } from '../modules/api.js';

// ==================== المتغيرات ====================
let pricesData = {};
let activeTab = 'gold';
let autoRefreshInterval = null;
const REFRESH_INTERVAL = 30000; // 30 ثانية

// ==================== التهيئة ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('📊 Prices page initialized');
    initPricesPage();
});

/**
 * تهيئة صفحة الأسعار
 */
function initPricesPage() {
    const resetPricesPosition = () => {
        window.history.replaceState(null, document.title, window.location.pathname + window.location.search);
        window.scrollTo({ top: 0, behavior: 'auto' });
    };
    resetPricesPosition();
    window.addEventListener('load', resetPricesPosition, { once: true });
    window.setTimeout(resetPricesPosition, 300);

    // إضافة مستمعين للأحداث
    setupPricesEventListeners();
    
    // تحميل البيانات الأولية
    loadPricesData();
    
    // بدء التحديث التلقائي
    startPricesAutoRefresh();
    
    // تحديث وقت التحديث
    updateLastUpdateTime();
    setupSectionSidebar();
    filterPrices('gold');
}

function setupSectionSidebar() {
    document.querySelectorAll('.sidebar-nav a[data-section]').forEach(link => {
        link.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            filterPrices(link.dataset.section);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
}

// ==================== تحميل البيانات ====================

/**
 * تحميل بيانات الأسعار
 */
async function loadPricesData() {
    try {
        pricesData = window.AT?.appData || await fetchMarketData();
        window.AT = window.AT || {};
        window.AT.appData = pricesData;
        renderPrices();
    } catch (error) {
        console.error('Error loading prices data:', error);
        showErrorMessage('حدث خطأ في الاتصال بالخادم.');
    }
}

// ==================== عرض الأسعار ====================

/**
 * عرض جميع الأسعار
 */
function renderPrices() {
    renderGoldPrices();
    renderSilverPrices();
    renderMetalsPrices();
    renderOilPrices();
    renderCryptoPrices();
    renderFXPrices();
    renderPairsPrices();
    renderStockPrices();
    renderFuelPrices();
    updatePriceTime();
    
    // تحديث التبويب النشط
    filterPrices(activeTab);
}

/**
 * عرض أسعار الذهب
 */
function renderGoldPrices() {
    const container = document.getElementById('goldPrices');
    if (!container) return;
    
    const goldData = {
        spot: getPrice('goldSpot', '$0'),
        home: getPrice('goldHome', '$0'),
        future: getPrice('goldFuture', '$0'),
        gramUSD: getPrice('goldGramUSD', '$0'),
        gramEGP: getPrice('g24', '0 ج.م'),
        g24: getPrice('g24', '0 ج.م'),
        g21: getPrice('g21', '0 ج.م'),
        g18: getPrice('g18', '0 ج.م'),
        pound: getPrice('goldPound', '0 ج.م'),
        dollar: getPrice('goldDollar', '0 ج.م')
    };
    
    container.innerHTML = `
        <div class="prices-grid gold-grid">
            <div class="price-item main-price">
                <span class="price-label">سعر الذهب العالمي</span>
                <span class="price-value gold">${goldData.spot}</span>
                <span class="price-sub">${goldData.home}</span>
            </div>
            <div class="price-item">
                <span class="price-label">عيار 24</span>
                <span class="price-value">${goldData.g24}</span>
            </div>
            <div class="price-item">
                <span class="price-label">عيار 21</span>
                <span class="price-value">${goldData.g21}</span>
            </div>
            <div class="price-item">
                <span class="price-label">عيار 18</span>
                <span class="price-value">${goldData.g18}</span>
            </div>
            <div class="price-item">
                <span class="price-label">الجنيه الذهب</span>
                <span class="price-value">${goldData.pound}</span>
            </div>
            <div class="price-item">
                <span class="price-label">سعر الدولار</span>
                <span class="price-value">${goldData.dollar}</span>
            </div>
        </div>
    `;
}

/**
 * عرض أسعار الفضة
 */
function renderSilverPrices() {
    const container = document.getElementById('silverPrices');
    if (!container) return;
    
    const silverData = {
        spot: getPrice('silverSpot', '$0'),
        home: getPrice('silverHome', '$0'),
        gram: getPrice('silverGramEGP', '0 ج.م'),
        silver925: getPrice('silver925', '0 ج.م'),
        dollar: getPrice('silverDollar', '0 ج.م')
    };
    
    container.innerHTML = `
        <div class="prices-grid silver-grid">
            <div class="price-item main-price">
                <span class="price-label">سعر الفضة العالمي</span>
                <span class="price-value silver">${silverData.spot}</span>
                <span class="price-sub">${silverData.home}</span>
            </div>
            <div class="price-item">
                <span class="price-label">سعر الجرام</span>
                <span class="price-value">${silverData.gram}</span>
            </div>
            <div class="price-item">
                <span class="price-label">عيار 925</span>
                <span class="price-value">${silverData.silver925}</span>
            </div>
            <div class="price-item">
                <span class="price-label">سعر الدولار</span>
                <span class="price-value">${silverData.dollar}</span>
            </div>
        </div>
    `;
}

/**
 * عرض أسعار المعادن الأخرى
 */
function renderMetalsPrices() {
    const container = document.getElementById('metalsPrices');
    if (!container) return;
    
    const metals = [
        { key: 'platinumHome', label: 'البلاتين', icon: '💎' },
        { key: 'palladiumHome', label: 'البلاديوم', icon: '💎' },
        { key: 'copperHome', label: 'النحاس', icon: '🔶' },
        { key: 'rhodiumHome', label: 'الروديوم', icon: '💎' }
    ];
    
    let html = '<div class="prices-grid metals-grid">';
    metals.forEach(metal => {
        const value = getPrice(metal.key, '—');
        html += `
            <div class="price-item">
                <span class="price-label">${metal.icon} ${metal.label}</span>
                <span class="price-value">${value}</span>
            </div>
        `;
    });
    html += '</div>';
    
    container.innerHTML = html;
}

/**
 * عرض أسعار النفط
 */
function renderOilPrices() {
    const container = document.getElementById('oilPrices');
    if (!container) return;
    
    const oilData = {
        brent: getPrice('oilHome', '$0'),
        wti: getPrice('oilWTI', '$0'),
        egp: getPrice('oilEGP', '0 ج.م'),
        gas: getPrice('globalGasSpot', '$0')
    };
    
    container.innerHTML = `
        <div class="prices-grid oil-grid">
            <div class="price-item main-price">
                <span class="price-label">خام برنت</span>
                <span class="price-value oil">${oilData.brent}</span>
                <span class="price-sub">${oilData.egp}</span>
            </div>
            <div class="price-item">
                <span class="price-label">خام WTI</span>
                <span class="price-value oil">${oilData.wti}</span>
            </div>
            <div class="price-item">
                <span class="price-label">الغاز العالمي</span>
                <span class="price-value oil">${oilData.gas}</span>
            </div>
        </div>
    `;
}

/**
 * عرض أسعار العملات الرقمية
 */
function renderCryptoPrices() {
    const container = document.getElementById('cryptoPrices');
    if (!container) return;
    
    const cryptos = [
        { key: 'btcSpot', label: 'بتكوين', icon: '₿', color: 'btc' },
        { key: 'ethSpot', label: 'إيثيريوم', icon: '⟠', color: 'eth' },
        { key: 'solSpot', label: 'سولانا', icon: '◎', color: 'sol' },
        { key: 'bnbSpot', label: 'بي إن بي', icon: '◆', color: 'bnb' },
        { key: 'xrpSpot', label: 'ريبل', icon: '✕', color: 'xrp' },
        { key: 'adaSpot', label: 'كارادانو', icon: '▣', color: 'ada' },
        { key: 'dogeSpot', label: 'دوجكوين', icon: '🐕', color: 'doge' },
        { key: 'trxSpot', label: 'ترون', icon: '▲', color: 'trx' },
        { key: 'dotSpot', label: 'بولكادوت', icon: '●', color: 'dot' },
        { key: 'linkSpot', label: 'تشين لينك', icon: '🔗', color: 'link' }
    ];
    
    let html = '<div class="prices-grid crypto-grid">';
    cryptos.forEach(crypto => {
        const value = getPrice(crypto.key, '$0');
        html += `
            <div class="price-item crypto-item ${crypto.color}">
                <span class="price-label">${crypto.icon} ${crypto.label}</span>
                <span class="price-value">${value}</span>
            </div>
        `;
    });
    html += '</div>';
    
    container.innerHTML = html;
}

/**
 * عرض أسعار العملات (الفوركس)
 */
function renderFXPrices() {
    const container = document.getElementById('fxPrices');
    if (!container) return;
    
    const pairs = [
        { key: 'eurusd', label: 'EUR/USD', icon: '💶' },
        { key: 'gbpusd', label: 'GBP/USD', icon: '💷' },
        { key: 'usdjpy', label: 'USD/JPY', icon: '💴' },
        { key: 'usdchf', label: 'USD/CHF', icon: '🇨🇭' },
        { key: 'audusd', label: 'AUD/USD', icon: '🇦🇺' },
        { key: 'usdcad', label: 'USD/CAD', icon: '🇨🇦' },
        { key: 'nzdusd', label: 'NZD/USD', icon: '🇳🇿' },
        { key: 'eurgbp', label: 'EUR/GBP', icon: '💶💷' },
        { key: 'eurjpy', label: 'EUR/JPY', icon: '💶💴' },
        { key: 'gbpjpy', label: 'GBP/JPY', icon: '💷💴' }
    ];
    
    // العملات المحلية
    const localCurrencies = [
        { key: 'eurSpot', label: 'اليورو', icon: '💶' },
        { key: 'sarSpot', label: 'الريال السعودي', icon: '🇸🇦' },
        { key: 'aedSpot', label: 'الدرهم الإماراتي', icon: '🇦🇪' },
        { key: 'kwdSpot', label: 'الدينار الكويتي', icon: '🇰🇼' }
    ];
    
    let html = `<div class="fx-section official-rate-section">
        <h4>السعر الرسمي</h4>
        <div class="prices-grid official-grid">
            <div class="price-item main-price">
                <span class="price-label">💵 الدولار الأمريكي الرسمي</span>
                <span class="price-value">${getPrice('usdSpot', '—')}</span>
            </div>
        </div>
    </div>`;

    html += '<div class="fx-section"><h4>العملات المحلية</h4><div class="prices-grid local-grid">';
    localCurrencies.forEach(curr => {
        const value = getPrice(curr.key, '—');
        html += `
            <div class="price-item local-item">
                <span class="price-label">${curr.icon} ${curr.label}</span>
                <span class="price-value">${value}</span>
            </div>
        `;
    });
    html += '</div></div>';

    html += '<div class="fx-section"><h4>أزواج العملات العالمية</h4><div class="prices-grid fx-grid">';
    pairs.forEach(pair => {
        const value = getPrice(pair.key, '—');
        html += `
            <div class="price-item fx-item">
                <span class="price-label">${pair.icon} ${pair.label}</span>
                <span class="price-value">${value}</span>
            </div>
        `;
    });
    html += '</div></div>';
    
    // إضافة الأسعار السوداء
    html += '<div class="fx-section"><h4>السوق الموازي (أسعار سوداء)</h4><div class="prices-grid black-grid">';
    const blackCurrencies = [
        { key: 'blackUSD', label: 'الدولار', icon: '💵' },
        { key: 'blackEUR', label: 'اليورو', icon: '💶' },
        { key: 'blackSAR', label: 'الريال السعودي', icon: '🇸🇦' },
        { key: 'blackAED', label: 'الدرهم الإماراتي', icon: '🇦🇪' },
        { key: 'blackKWD', label: 'الدينار الكويتي', icon: '🇰🇼' }
    ];
    blackCurrencies.forEach(curr => {
        const value = getPrice(curr.key, '0 ج.م');
        html += `
            <div class="price-item black-item">
                <span class="price-label">${curr.icon} ${curr.label}</span>
                <span class="price-value">${value}</span>
            </div>
        `;
    });
    html += '</div></div>';
    
    container.innerHTML = html;
}

function renderPairsPrices() {
    const container = document.getElementById('pairsPrices');
    if (!container) return;

    const pairs = [
        ['eurusd', 'EUR/USD'], ['gbpusd', 'GBP/USD'], ['usdjpy', 'USD/JPY'],
        ['usdchf', 'USD/CHF'], ['audusd', 'AUD/USD'], ['usdcad', 'USD/CAD'],
        ['nzdusd', 'NZD/USD'], ['eurgbp', 'EUR/GBP'], ['eurjpy', 'EUR/JPY'],
        ['gbpjpy', 'GBP/JPY']
    ];

    container.innerHTML = `<div class="prices-grid pairs-grid">${pairs.map(([key, label]) => `
        <div class="price-item">
            <span class="price-label">${label}</span>
            <span class="price-value">${getPrice(key, '—')}</span>
        </div>
    `).join('')}</div>`;
}

/**
 * عرض أسعار الأسهم والمؤشرات
 */
function renderStockPrices() {
    const container = document.getElementById('stocksPrices');
    if (!container) return;
    
    const stocks = [
        { key: 'sp500', label: 'S&P 500', icon: '🇺🇸' },
        { key: 'nasdaq', label: 'ناسداك', icon: '📈' },
        { key: 'ftse', label: 'فوتسي 100', icon: '🇬🇧' },
        { key: 'nikkei', label: 'نيكاي 225', icon: '🇯🇵' },
        { key: 'shanghai', label: 'شنغهاي', icon: '🇨🇳' },
        { key: 'tasi', label: 'تاسي', icon: '🇸🇦' },
        { key: 'uae_index', label: 'مؤشر الإمارات', icon: '🇦🇪' },
        { key: 'egx30', label: 'إي جي إكس 30', icon: '🇪🇬' },
        { key: 'egx70', label: 'إي جي إكس 70', icon: '🇪🇬' },
        { key: 'egx100', label: 'إي جي إكس 100', icon: '🇪🇬' }
    ];
    
    let html = '<div class="prices-grid stock-grid">';
    stocks.forEach(stock => {
        const value = getPrice(stock.key, '—');
        html += `
            <div class="price-item stock-item">
                <span class="price-label">${stock.icon} ${stock.label}</span>
                <span class="price-value">${value}</span>
            </div>
        `;
    });
    html += '</div>';
    
    container.innerHTML = html;
}

/**
 * عرض أسعار الوقود
 */
function renderFuelPrices() {
    const container = document.getElementById('fuelPrices');
    if (!container) return;
    
    const fuels = [
        { key: 'gas80', label: 'بنزين 80', icon: '⛽' },
        { key: 'gas92', label: 'بنزين 92', icon: '⛽' },
        { key: 'gas95', label: 'بنزين 95', icon: '⛽' },
        { key: 'diesel', label: 'سولار', icon: '🛢️' },
        { key: 'kerosene', label: 'كيروسين', icon: '🛢️' }
    ];
    
    let html = '<div class="prices-grid fuel-grid">';
    fuels.forEach(fuel => {
        const value = getPrice(fuel.key, '0 ج.م');
        html += `
            <div class="price-item fuel-item">
                <span class="price-label">${fuel.icon} ${fuel.label}</span>
                <span class="price-value">${value}</span>
            </div>
        `;
    });
    html += '</div>';
    
    container.innerHTML = html;
}

// ==================== فلترة الأسعار ====================

/**
 * فلترة الأسعار حسب التبويب
 */
function filterPrices(tab) {
    activeTab = tab;
    
    // إخفاء جميع الأقسام أولاً
    const sections = document.querySelectorAll('.price-section');
    sections.forEach(section => {
        const isActive = tab === 'all' || section.id === tab;
        section.style.display = isActive ? 'block' : 'none';
        section.classList.toggle('active-section', isActive && tab !== 'all');
    });
    
    // تحديث أزرار التبويب
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    document.querySelectorAll('.sidebar-nav a[data-section]').forEach(link => {
        link.parentElement.classList.toggle('active', link.dataset.section === tab);
    });
}

/**
 * إعداد مستمعين لأحداث التبويب
 */
function setupPricesEventListeners() {
    // أزرار التبويب
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.dataset.tab || 'all';
            filterPrices(tab);
        });
    });
    
    // زر التحديث
    const refreshBtn = document.getElementById('refresh-prices');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            this.classList.add('spinning');
            loadPricesData();
            setTimeout(() => this.classList.remove('spinning'), 1000);
        });
    }
    
    // استماع لأحداث تحميل البيانات من التطبيق العام
    document.addEventListener('dataLoaded', function(e) {
        if (e.detail) {
            pricesData = e.detail;
            renderPrices();
        }
    });
}

// ==================== التحديث التلقائي ====================

/**
 * بدء التحديث التلقائي
 */
function startPricesAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    
    autoRefreshInterval = setInterval(() => {
        if (document.visibilityState === 'visible' && navigator.onLine) {
            loadPricesData();
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
    const lastUpdate = document.getElementById('lastUpdate');
    if (lastUpdate) {
        lastUpdate.textContent = `آخر تحديث: ${timeStr}`;
    }
}

/**
 * تحديث وقت الأسعار
 */
function updatePriceTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('ar-EG', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    const priceTime = document.getElementById('priceTime');
    if (priceTime) {
        priceTime.textContent = `🕐 ${timeStr}`;
    }
}

// تحديث الوقت كل ثانية
setInterval(updateLastUpdateTime, 1000);
setInterval(updatePriceTime, 1000);

// ==================== دوال مساعدة ====================

/**
 * الحصول على سعر من البيانات
 */
function getPrice(key, defaultValue = '—') {
    const value = pricesData?.[key];
    if (value == null || value === '') return '—';
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value.toLocaleString('en-US', { maximumFractionDigits: 4 }) : '—';
    }
    const text = String(value).trim();
    return text && !/^(nan|undefined|null)$/i.test(text) ? text : '—';
}

/**
 * عرض رسالة خطأ
 */
function showErrorMessage(message) {
    const container = document.getElementById('pageContent');
    if (container) {
        container.innerHTML = `
            <div class="error-container">
                <div class="error-icon">⚠️</div>
                <p>${message}</p>
                <button onclick="loadPricesData()" class="retry-btn">إعادة المحاولة</button>
            </div>
        `;
    }
}

// ==================== تصدير الدوال ====================

window.PricesPage = {
    loadPricesData,
    renderPrices,
    filterPrices,
    pricesData
};

console.log('✅ Prices page module loaded successfully');



