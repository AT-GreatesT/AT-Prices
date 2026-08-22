import CONFIG from '../config.js';
import { fetchMarketData, refreshData } from '../modules/api.js';

let ratesData = {};
let refreshTimer;
let activeSection = 'overview';

const countries = [
  { key: 'US', name: 'الولايات المتحدة', bank: 'الاحتياطي الفيدرالي الأمريكي', flag: '🇺🇸', color: '#2563eb' },
  { key: 'EG', name: 'مصر', bank: 'البنك المركزي المصري', flag: '🇪🇬', color: '#e67e22' },
  { key: 'SA', name: 'السعودية', bank: 'البنك المركزي السعودي', flag: '🇸🇦', color: '#16a34a' },
  { key: 'EU', name: 'منطقة اليورو', bank: 'البنك المركزي الأوروبي', flag: '🇪🇺', color: '#9333ea' }
];

function parseRateData(data) {
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch { return {}; }
  }
  if (!data || typeof data !== 'object') return {};
  data = data.ratesData || data.rates || data.data || data;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch { return {}; }
  }
  return data && typeof data === 'object' ? data : {};
}

function hasRateData(data) {
  return data && typeof data === 'object' && ['US', 'EG', 'SA', 'EU'].some(key => data[key]);
}

function escapeHTML(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function rateValue(key) {
  const value = ratesData[key]?.centralBankRate ?? ratesData[key]?.rate ?? ratesData[key]?.current;
  if (value == null || value === '' || value === '—' || value === '-') {
    return key === 'EG' ? 'غير متاح من المصدر' : '—';
  }
  return value;
}

function renderOverview() {
  const container = document.getElementById('ratesOverview');
  if (!container) return;
  container.innerHTML = `<div class="rates-overview-grid">${countries.map(country => `
    <article class="rate-card rate-${country.key.toLowerCase()}" style="--rate-accent:${country.color}">
      <span class="rate-flag">${country.flag}</span>
      <span class="rate-country">${country.name}</span>
      <span class="rate-currency">${ratesData[country.key]?.currency || ''}</span>
      <strong class="rate-value">${rateValue(country.key)}</strong>
      <span class="rate-status">${ratesData[country.key]?.source || 'آخر قراءة متاحة'}${ratesData[country.key]?.date ? ` · ${ratesData[country.key].date}` : ''}</span>
    </article>
  `).join('')}</div>`;
}

function renderDetails() {
  const container = document.getElementById('ratesDetails');
  if (!container) return;
  container.innerHTML = `<div class="rates-details-grid">${countries.map(country => `
    <article class="detail-card">
      <div class="detail-header">
        <span class="detail-flag">${country.flag}</span>
        <div class="detail-title"><h4>${country.name}</h4><span>${country.bank}</span></div>
        <strong class="detail-rate">${rateValue(country.key)}</strong>
      </div>
      <div class="detail-body"><p>${escapeHTML(ratesData[country.key]?.analysis || 'سعر الفائدة الأساسي وفق آخر قراءة متاحة من مصدر البيانات.')}</p><span class="detail-source">المصدر: ${escapeHTML(ratesData[country.key]?.source || '—')} · العملة: ${escapeHTML(ratesData[country.key]?.currency || '—')}${ratesData[country.key]?.date ? ` · التاريخ: ${escapeHTML(ratesData[country.key].date)}` : ''}</span></div>
    </article>
  `).join('')}</div>`;
}

function renderAnalysis() {
  const container = document.getElementById('ratesAnalysis');
  if (!container) return;

  const analysis = getRateAnalysis();
  const updatedAt = ratesData.updatedAt
    ? new Date(ratesData.updatedAt).toLocaleString('ar-EG')
    : 'غير متاح';
  const sources = countries.map(country => {
    const data = ratesData[country.key] || {};
    return `<li><strong>${country.flag} ${country.name}:</strong> ${escapeHTML(data.source || 'مصدر غير محدد')} ${data.date ? `(${escapeHTML(data.date)})` : ''}</li>`;
  }).join('');

  container.innerHTML = `
    <article class="ai-analysis-card">
      <div class="ai-analysis-header">
        <span class="ai-analysis-icon">🧠</span>
        <div><h3>رأي Gemini في بيانات الفائدة</h3><span>تحليل مبني على القراءات المرسلة من المصادر</span></div>
      </div>
      <p class="ai-analysis-text">${escapeHTML(analysis)}</p>
      <div class="ai-analysis-meta"><span>آخر تحديث: ${escapeHTML(updatedAt)}</span><span>لا يتم تعديل الأرقام بواسطة الذكاء الاصطناعي</span></div>
      <div class="ai-sources"><h4>مصادر البيانات</h4><ul>${sources}</ul></div>
    </article>`;
}

function getRateAnalysis() {
  const readings = countries
    .map(country => ({ country, value: parseFloat(rateValue(country.key)) }))
    .filter(item => Number.isFinite(item.value));
  const serverAnalysis = extractAnalysisText(ratesData.analysis);
  const hasUsefulServerAnalysis = serverAnalysis
    && !/HTTP\s*429|لا يوجد تحليل|غير متاح/i.test(String(serverAnalysis));

  if (hasUsefulServerAnalysis) return String(serverAnalysis);
  if (!readings.length) return 'لا تتوفر قراءات رقمية كافية لإعداد تحليل موثوق.';

  const highest = readings.reduce((first, item) => item.value > first.value ? item : first);
  const lowest = readings.reduce((first, item) => item.value < first.value ? item : first);
  const average = readings.reduce((sum, item) => sum + item.value, 0) / readings.length;
  const spread = highest.value - lowest.value;
  const direction = spread >= 2
    ? `يوجد تفاوت واضح بين الدول؛ أعلى قراءة في ${highest.country.name} (${highest.value}%) وأدنى قراءة في ${lowest.country.name} (${lowest.value}%).`
    : `القراءات متقاربة نسبيًا حول متوسط ${average.toFixed(2)}%.`;
  const recommendation = average >= 5
    ? 'التوصية: الحفاظ على سياسة نقدية حذرة، ومراقبة التضخم قبل التفكير في خفض الفائدة.'
    : average >= 3
      ? 'التوصية: التريث في قرارات الخفض أو الرفع، ومتابعة التضخم والنمو معًا قبل اتخاذ قرار.'
      : 'التوصية: قد تسمح القراءات المنخفضة بمرونة أكبر أو خفض تدريجي، بشرط استقرار التضخم وسعر الصرف.';

  return `تحليل مبني على الأرقام المتاحة: متوسط أسعار الفائدة ${average.toFixed(2)}% عبر ${readings.length} دول. ${direction} ${recommendation}`;
}

function extractAnalysisText(value) {
  if (typeof value === 'string') return value.trim();
  if (!value || typeof value !== 'object') return '';
  if (typeof value.output_text === 'string') return value.output_text.trim();
  if (Array.isArray(value.steps)) {
    return value.steps
      .flatMap(step => Array.isArray(step.content) ? step.content : [])
      .filter(item => item?.type === 'text')
      .map(item => item.text || '')
      .join('')
      .trim();
  }
  if (Array.isArray(value.candidates)) {
    return value.candidates[0]?.content?.parts?.map(part => part.text || '').join('').trim() || '';
  }
  return '';
}

function renderComparison() {
  const container = document.getElementById('ratesComparison');
  if (!container) return;
  const values = countries.map(country => parseFloat(rateValue(country.key)) || 0);
  const maximum = Math.max(...values, 1);
  container.innerHTML = `<div class="comparison-container">
    <div class="comparison-bars">${countries.map((country, index) => {
    const value = values[index];
    return `<div class="comparison-item"><div class="comparison-label"><span>${country.flag} ${country.name}</span><strong>${rateValue(country.key)}</strong></div><div class="comparison-bar-container"><div class="comparison-bar" style="width:${(value / maximum) * 100}%;background:${country.color}"></div></div></div>`;
  }).join('')}</div></div>`;
}

function renderHistory() {
  const container = document.getElementById('ratesHistory');
  if (!container) return;
  container.innerHTML = `<div class="history-container"><p class="history-note">يتم عرض آخر قراءة متاحة من مصدر البيانات. سيتم إضافة السجل الزمني الكامل عند توفره من الواجهة الخلفية.</p><div class="history-table-wrap"><table class="history-table"><thead><tr><th>الدولة</th><th>آخر قراءة</th><th>العملة</th><th>الحالة</th></tr></thead><tbody>${countries.map(country => `<tr><td>${country.flag} ${country.name}</td><td class="history-rate">${rateValue(country.key)}</td><td>${ratesData[country.key]?.currency || '—'}</td><td>متاحة</td></tr>`).join('')}</tbody></table></div></div>`;
}

function renderRates() {
  renderOverview();
  renderAnalysis();
  renderDetails();
  renderComparison();
  renderHistory();
  showSection(activeSection);
}

function showSection(sectionId = 'overview') {
  activeSection = sectionId;
  document.querySelectorAll('.rate-section').forEach(section => {
    const visible = section.id === sectionId;
    section.style.display = visible ? 'block' : 'none';
    section.classList.toggle('active-section', visible);
  });
  document.querySelectorAll('.sidebar-nav a[data-rate-section]').forEach(link => {
    link.parentElement.classList.toggle('active', link.dataset.rateSection === sectionId);
  });
}

function setupSectionSidebar() {
  document.querySelectorAll('.sidebar-nav a[data-rate-section]').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      showSection(link.dataset.rateSection);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

async function loadRatesData(forceRefresh = false) {
  try {
    const sharedData = window.AT?.appData;
    const sharedRates = parseRateData(sharedData?.ratesData);
    const data = hasRateData(sharedRates) && !forceRefresh
      ? sharedData
      : await (forceRefresh ? refreshData() : fetchMarketData());
    ratesData = parseRateData(data.ratesData ?? data.rates);
    window.AT = window.AT || {};
    window.AT.appData = data;
    renderRates();
    document.getElementById('connectionStatus')?.replaceChildren(document.createTextNode('متصل'));
  } catch (error) {
    console.error('Rates data error:', error);
    document.getElementById('ratesOverview').innerHTML = '<div class="rates-error">تعذر تحميل بيانات أسعار الفائدة. حاول التحديث مرة أخرى.</div>';
  }
}

function updateTime() {
  const target = document.getElementById('lastUpdate');
  if (!target) return;
  target.innerHTML = `<i class="fas fa-clock"></i><span>آخر تحديث: ${new Date().toLocaleTimeString('ar-EG')}</span>`;
}

document.addEventListener('DOMContentLoaded', () => {
  window.history.replaceState(null, document.title, window.location.pathname + window.location.search);
  window.scrollTo({ top: 0, behavior: 'auto' });
  setupSectionSidebar();
  showSection('overview');
  loadRatesData();
  updateTime();
  refreshTimer = window.setInterval(loadRatesData, CONFIG.REFRESH_INTERVAL);
  window.setInterval(updateTime, 1000);
  document.getElementById('refreshBtn')?.addEventListener('click', loadRatesData);
});

window.RatesPage = { loadRatesData, renderRates };
