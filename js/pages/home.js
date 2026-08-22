import CONFIG from '../config.js';
import { fetchMarketData } from '../modules/api.js';

function setText(id, value) {
  const element = document.getElementById(id);
  if (element && value != null && value !== '') element.textContent = value;
}

function normalizeInflation(value) {
  let data = value;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      return {};
    }
  }
  if (!data || typeof data !== 'object') return {};
  data = data.inflationData || data.data || data.payload || data.out || data;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      return {};
    }
  }

  return Object.fromEntries(['US', 'EG', 'SA', 'EU'].map(key => {
    const item = data[key] || {};
    return [key, {
      ...item,
      current: item.current ?? item.annual ?? item.yearOverYear ?? '—'
    }];
  }));
}

function normalizeRates(value) {
  let data = value;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      return {};
    }
  }
  if (!data || typeof data !== 'object') return {};
  data = data.ratesData || data.rates || data.data || data;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      return {};
    }
  }

  return Object.fromEntries(['US', 'EG', 'SA', 'EU'].map(key => {
    const item = data[key] || {};
    return [key, {
      ...item,
      centralBankRate: item.centralBankRate ?? item.rate ?? item.current ?? '—'
    }];
  }));
}

function getDataField(data, primaryKey, alternateKey) {
  const primary = data?.[primaryKey];
  if (primary != null && primary !== '') return primary;
  return data?.[alternateKey];
}

function normalizeForecast(value) {
  let data = value;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch { return {}; }
  }
  if (!data || typeof data !== 'object') return {};
  data = data.forecastData || data.forecast || data.data || data.payload || data;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch { return {}; }
  }
  return data && typeof data === 'object' ? data : {};
}

function renderHome(data) {
  setText('previewGold', data.goldGramEGP || data.g21 || '—');
  setText('previewUSD', data.usdHome || data.fxHome || '—');
  setText('previewBTC', data.btcSpot || '—');
  setText('previewOil', data.oilHome || '—');

  const rates = normalizeRates(getDataField(data, 'ratesData', 'rates'));
  setText('previewUSRate', rates.US?.centralBankRate || '—');
  setText('previewEGRate', rates.EG?.centralBankRate || '—');
  setText('previewSARate', rates.SA?.centralBankRate || '—');
  setText('previewEURate', rates.EU?.centralBankRate || '—');

  const inflation = normalizeInflation(getDataField(data, 'inflationData', 'inflation'));
  setText('previewUSInf', inflation.US?.current || '—');
  setText('previewEGInf', inflation.EG?.current || '—');
  setText('previewSAInf', inflation.SA?.current || '—');
  setText('previewEUInf', inflation.EU?.current || '—');

  const newsList = document.getElementById('previewNewsList');
  if (newsList && Array.isArray(data.newsData)) {
    newsList.innerHTML = data.newsData.slice(0, 3).map(item => `
      <div class="news-item">
        <span class="news-item-title">${item.title || 'خبر اقتصادي'}</span>
        <span class="news-item-time">${item.time || ''}</span>
      </div>
    `).join('') || '<div class="news-item">لا توجد أخبار حاليًا</div>';
  }

  const forecast = normalizeForecast(data.forecastData ?? data.forecast);
  setText('previewSentiment', forecast.metrics?.sentimentScore || '—');
  setText('previewGoldOutlook', forecast.insights?.goldOutlook || '—');
  setText('previewCryptoOutlook', forecast.insights?.cryptoOutlook || '—');
  setText('previewRecommendation', forecast.insights?.smartRecommendation || '—');
  setText('autoUpdateStatus', 'نشط');
  setText('connectionStatus', 'متصل');
  setText('updateInterval', `${CONFIG.REFRESH_INTERVAL / 1000} ثانية`);
}

async function loadHomeData() {
  try {
    const data = await fetchMarketData();
    data.inflationData = await fillAnnualInflationFallback(data.inflationData);
    renderHome(data);
  } catch (error) {
    console.error('Home data error:', error);
    setText('connectionStatus', 'تعذر الاتصال');
  }
}

async function fillAnnualInflationFallback(value) {
  let data = value;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch { return value; }
  }
  if (!data || typeof data !== 'object') return value;
  const codes = { US: 'USA', EG: 'EGY', SA: 'SAU', EU: 'EMU' };
  const missing = Object.keys(codes).filter(key => {
    const item = data[key] || {};
    return item.annual == null && item.current == null;
  });
  if (!missing.length) return data;

  const results = await Promise.all(missing.map(async key => {
    try {
      const response = await fetch(`https://api.worldbank.org/v2/country/${codes[key]}/indicator/FP.CPI.TOTL.ZG?format=json&per_page=5`);
      const payload = await response.json();
      const row = Array.isArray(payload?.[1]) ? payload[1].find(item => item?.value != null) : null;
      return [key, row?.value != null ? `${Number(row.value).toFixed(2)}%` : '—'];
    } catch { return [key, '—']; }
  }));
  const merged = { ...data };
  results.forEach(([key, annual]) => { merged[key] = { ...merged[key], annual, current: annual }; });
  return merged;
}

document.addEventListener('DOMContentLoaded', () => {
  loadHomeData();
  document.addEventListener('dataLoaded', event => {
    if (event.detail) renderHome(event.detail);
  });
  setInterval(loadHomeData, CONFIG.REFRESH_INTERVAL);
});

export { loadHomeData };
