// js/modules/api.js
// موديول موحد لجلب البيانات من API

import CONFIG from '../config.js';

const DATA_CACHE_KEY = 'at-financial-data';
const DATA_CACHE_TTL = 30 * 1000;
let marketDataPromise = null;

function parseJSONField(value, fallback) {
    if (value == null || value === '') return fallback;
    if (typeof value !== 'string') return value;
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

function normalizeMarketData(data) {
    if (!data || typeof data !== 'object') {
        return {};
    }

    // بعض الـ APIs ترجع البيانات داخل data
    const source =
        data.data &&
        typeof data.data === 'object' &&
        !Array.isArray(data.data)
            ? data.data
            : data;

    return {
        ...source,

        ratesData: parseJSONField(
            source.ratesData,
            {}
        ),

        inflationData: parseJSONField(
            source.inflationData,
            {}
        ),

        newsData: parseJSONField(
            source.newsData ??
            source.news ??
            source.articles ??
            source.results ??
            [],
            []
        ),

        forecastData: parseJSONField(
            source.forecastData,
            {}
        )
    };
}

/**
 * دالة لجلب البيانات من API مع معالجة الأخطاء
 * @param {string} endpoint - نقطة النهاية الإضافية (اختياري)
 * @param {Object} options - خيارات إضافية للطلب
 * @returns {Promise<Object>} - البيانات المستلمة
 */
async function fetchAPI(endpoint = '', options = {}) {
    const url = `${CONFIG.API_URL}${endpoint}`;
    
    const defaultOptions = {
        method: 'GET',
        headers: {
            'X-My-App-Auth': CONFIG.API_SECRET_KEY,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        timeout: 30000 // 30 ثانية
    };
    
    const { timeout = 30000, ...requestOptions } = { ...defaultOptions, ...options };
    
    try {
        // إعداد مؤقت للإلغاء
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const response = await fetch(url, {
            ...requestOptions,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        return {
            success: true,
            data: data,
            status: response.status
        };
        
    } catch (error) {
        console.error('API fetch error:', error);
        
        // معالجة أنواع مختلفة من الأخطاء
        let errorMessage = 'حدث خطأ في الاتصال بالخادم';
        if (error.name === 'AbortError') {
            errorMessage = 'انتهت مهلة الاتصال. يرجى المحاولة مرة أخرى.';
        } else if (error.message.includes('Failed to fetch')) {
            errorMessage = 'تعذر الاتصال بالخادم. تأكد من اتصالك بالإنترنت.';
        } else if (error.message.includes('HTTP')) {
            errorMessage = `خطأ في الخادم: ${error.message}`;
        }
        
        return {
            success: false,
            error: errorMessage,
            status: error.status || 500
        };
    }
}

/**
 * جلب البيانات الرئيسية للتطبيق
 * @returns {Promise<Object>} - البيانات الكاملة
 */
async function fetchAppData(forceRefresh = false) {
    if (!forceRefresh) {
        const cached = readCachedData();
        if (cached) return cached;
        if (marketDataPromise) return marketDataPromise;
    }

    marketDataPromise = fetchAPI(forceRefresh ? '?t=' + Date.now() : '').then(result => {
        if (!result.success) throw new Error(result.error);
        const data = normalizeMarketData(result.data);
        writeCachedData(data);
        return data;
    }).finally(() => {
        marketDataPromise = null;
    });

    return marketDataPromise;
}

function readCachedData() {
    try {
        const cached = JSON.parse(sessionStorage.getItem(DATA_CACHE_KEY) || 'null');
        if (cached && Date.now() - cached.timestamp < DATA_CACHE_TTL) return cached.data;
    } catch {
        return null;
    }
    return null;
}

function writeCachedData(data) {
    try {
        sessionStorage.setItem(DATA_CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data }));
    } catch {
        // التخزين اختياري، ولا يجب أن يمنع عرض البيانات.
    }
}

async function fetchMarketData(forceRefresh = false) {
    return fetchAppData(forceRefresh);
}

async function loadAppData(forceRefresh = false) {
    const data = await fetchMarketData(forceRefresh);
    window.AT = window.AT || {};
    window.AT.appData = data;
    window.AT.loadAppData = loadAppData;
    document.dispatchEvent(new CustomEvent('dataLoaded', { detail: data }));
    return data;
}

/**
 * تحديث البيانات وتجاوز الكاش المحلي.
 */
async function refreshData() {
    return fetchAppData(true);
}

/**
 * جلب بيانات محددة من التطبيق
 * @param {string} key - مفتاح البيانات المطلوبة
 * @returns {Promise<any>} - القيمة المطلوبة
 */
async function fetchSpecificData(key) {
    const data = await fetchMarketData();
    return data[key] || null;
}


/**
 * فحص اتصال API
 * @returns {Promise<boolean>} - حالة الاتصال
 */
async function checkConnection() {
    try {
        const result = await fetchAPI('?check=true');
        return result.success;
    } catch {
        return false;
    }
}

// تصدير الدوال للاستخدام
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        fetchAPI,
        fetchAppData,
        fetchMarketData,
        loadAppData,
        refreshData,
        fetchSpecificData,
        checkConnection
    };
}

// تصدير للاستخدام في المتصفح
window.API = {
    fetchAPI,
    fetchAppData,
    fetchMarketData,
    loadAppData,
    refreshData,
    fetchSpecificData,
    checkConnection
};

window.AT = window.AT || {};
window.AT.loadAppData = loadAppData;

export {
    fetchAPI,
    fetchAppData,
    fetchMarketData,
    loadAppData,
    refreshData,
    fetchSpecificData,
    checkConnection
};

console.log('✅ API module loaded successfully');


