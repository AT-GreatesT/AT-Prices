import CONFIG from '../config.js';

const REFRESH_INTERVAL = 120000;
const COUNTRIES = {
    US: { name: 'الولايات المتحدة', currency: 'USD', flag: '🇺🇸', color: '#1a73e8', target: 2 },
    EG: { name: 'مصر', currency: 'EGP', flag: '🇪🇬', color: '#e67e22', target: 7 },
    SA: { name: 'السعودية', currency: 'SAR', flag: '🇸🇦', color: '#27ae60', target: 2 },
    EU: { name: 'منطقة اليورو', currency: 'EUR', flag: '🇪🇺', color: '#8e44ad', target: 2 }
};

let inflationData = {};
let refreshTimer;
let activeSection = 'overview';

document.addEventListener('DOMContentLoaded', () => {
    loadInflationData();
    refreshTimer = setInterval(loadInflationData, REFRESH_INTERVAL);
    document.getElementById('refreshBtn')?.addEventListener('click', loadInflationData);
    setupSectionSidebar();
    showInflationSection(activeSection, false);
    document.addEventListener('dataLoaded', event => {
        const sharedInflation = normalizeData(event.detail?.inflationData ?? event.detail?.inflation ?? event.detail);
        if (hasInflationData(sharedInflation)) {
            inflationData = sharedInflation;
            renderInflation();
        }
    });
});

function setupSectionSidebar() {
    document.querySelectorAll('[data-inflation-section]').forEach(link => {
        link.addEventListener('click', event => {
            event.preventDefault();
            showInflationSection(link.dataset.inflationSection);
        });
    });
}

function hasInflationData(data) {
    return Object.values(data).some(item => item.annual !== '—' || item.monthly !== '—');
}

function showInflationSection(sectionId, resetScroll = true) {
    const section = document.getElementById(sectionId);
    if (!section) return;

    activeSection = sectionId;
    document.querySelectorAll('.inflation-section').forEach(item => {
        item.classList.toggle('is-hidden', item !== section);
    });
    document.querySelectorAll('[data-inflation-section]').forEach(item => {
        item.parentElement?.classList.toggle('active', item.dataset.inflationSection === sectionId);
    });

    if (resetScroll) {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
}

async function loadInflationData() {
    try {
        const localData = window.AT?.appData?.inflationData;
        const localInflation = normalizeData(localData);
        if (hasInflationData(localInflation)) {
            inflationData = await fillAnnualFallback(localInflation);
            renderInflation();
            return;
        }

        const response = await fetch(`${CONFIG.API_URL}?t=${Date.now()}`, {
            headers: { 'X-My-App-Auth': CONFIG.API_SECRET_KEY, Accept: 'application/json' }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        inflationData = await fillAnnualFallback(normalizeData(data.inflationData ?? data.inflation ?? data));
        if (!hasInflationData(inflationData)) throw new Error('Inflation data is empty');
        renderInflation();
    } catch (error) {
        console.error('Inflation data error:', error);
        showError('تعذر تحميل بيانات التضخم. يرجى المحاولة مرة أخرى.');
    }
}

async function fillAnnualFallback(data) {
    const worldBankCodes = { US: 'USA', EG: 'EGY', SA: 'SAU', EU: 'EMU' };
    const missing = Object.keys(worldBankCodes).filter(key => numberOf(data[key]?.annual) == null);
    if (!missing.length) return data;

    const results = await Promise.all(missing.map(async key => {
        try {
            const response = await fetch(`https://api.worldbank.org/v2/country/${worldBankCodes[key]}/indicator/FP.CPI.TOTL.ZG?format=json&per_page=5`);
            const payload = await response.json();
            const row = Array.isArray(payload?.[1]) ? payload[1].find(item => item?.value != null) : null;
            return [key, row?.value != null ? `${Number(row.value).toFixed(2)}%` : '—', row?.date || null];
        } catch {
            return [key, '—', null];
        }
    }));

    const merged = { ...data };
    results.forEach(([key, annual, date]) => {
        merged[key] = { ...merged[key], annual, current: annual, annualDate: date };
    });
    return merged;
}

function normalizeData(value) {
    let data = value;
    if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch { return {}; }
    }
    if (!data || typeof data !== 'object') return {};
    data = data.inflationData || data.data || data.payload || data.out || data;
    if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch { return {}; }
    }

    return Object.fromEntries(Object.entries(COUNTRIES).map(([key, country]) => {
        const item = data[key] || {};
        const annual = item.annual ?? item.yearOverYear ?? item.current ?? item.previous ?? '—';
        const monthly = item.monthly ?? item.monthOverMonth ?? item.monthlyRate ?? '—';
        return [key, {
            ...country,
            ...item,
            annual,
            monthly,
            current: annual,
            previous: item.previous ?? '—'
        }];
    }));
}

function renderInflation() {
    renderOverview();
    renderDetails();
    renderComparison();
    renderAnalysis();
    setText('lastUpdate', `آخر تحديث: ${new Date().toLocaleTimeString('ar-EG')}`);
}

function renderOverview() {
    const container = document.getElementById('inflationOverview');
    if (!container) return;
    container.innerHTML = `<div class="inflation-grid">${Object.entries(COUNTRIES).map(([key, country]) => {
        const item = inflationData[key] || country;
        return `<article class="inflation-card" style="border-color:${country.color}">
            <div class="inflation-card-header"><span>${country.flag}</span><strong>${country.name}</strong><small>${country.currency}</small></div>
            <div class="inflation-card-body">
                <div class="inflation-current" style="color:${country.color}">${item.annual}</div>
                <div class="inflation-previous">التضخم عن نفس الشهر من العام السابق</div>
                <div class="inflation-period-row"><span>شهري</span><strong>${item.monthly}</strong></div>
                <div class="inflation-period-row"><span>سنوي</span><strong>${item.annual}</strong></div>
            </div>
        </article>`;
    }).join('')}</div>`;
}

function renderDetails() {
    const container = document.getElementById('inflationDetails');
    if (!container) return;
    container.innerHTML = `<div class="details-grid">${Object.entries(COUNTRIES).map(([key, country]) => {
        const item = inflationData[key] || country;
        const annual = numberOf(item.annual);
        const status = annual == null ? 'غير متاح' : annual > country.target ? 'أعلى من المستهدف' : 'ضمن المستهدف';
        return `<article class="detail-card">
            <div class="detail-header"><span class="detail-flag">${country.flag}</span><div class="detail-title"><h4>${country.name}</h4><span>${country.currency}</span></div></div>
            <div class="detail-body"><div class="detail-stats">
                <div class="stat-item"><span class="stat-label">شهري</span><strong class="stat-value">${item.monthly}</strong></div>
                <div class="stat-item"><span class="stat-label">سنوي</span><strong class="stat-value ${annual > country.target ? 'high' : 'normal'}">${item.annual}</strong></div>
                <div class="stat-item"><span class="stat-label">المستهدف</span><strong class="stat-value target">${country.target}%</strong></div>
            </div><p class="detail-description">${item.date ? `آخر قراءة: ${item.date}` : 'آخر قراءة منشورة من المصدر الرسمي.'}</p><div class="detail-status ${annual > country.target ? 'warning' : 'success'}">${status}</div></div>
        </article>`;
    }).join('')}</div>`;
}

function renderComparison() {
    const container = document.getElementById('inflationComparison');
    if (!container) return;
    const rows = Object.entries(COUNTRIES).map(([key, country]) => ({ key, country, value: numberOf(inflationData[key]?.annual) }))
        .sort((a, b) => (b.value ?? -Infinity) - (a.value ?? -Infinity));
    const max = Math.max(...rows.map(row => row.value || 0), 1);
    container.innerHTML = `<div class="comparison-container"><h3 class="comparison-title">ترتيب الدول حسب التضخم السنوي</h3><div class="comparison-list">${rows.map((row, index) => `
        <div class="comparison-item" style="border-right-color:${row.country.color}"><span class="comp-rank">${index + 1}</span><span class="comp-flag">${row.country.flag}</span><strong class="comp-name">${row.country.name}</strong><b class="comp-rate" style="color:${row.country.color}">${row.value == null ? '—' : `${row.value.toFixed(2)}%`}</b><div class="comparison-bar-container"><div class="comparison-bar" style="width:${Math.max(0, (row.value || 0) / max * 100)}%;background:${row.country.color}"></div></div></div>`).join('')}</div></div>`;
}

function renderAnalysis() {
    const container = document.getElementById('inflationAnalysis');
    if (!container) return;

    const available = Object.entries(COUNTRIES)
        .map(([key, country]) => ({ country, item: inflationData[key] || {} }))
        .filter(({ item }) => numberOf(item.annual) != null);
    const highest = [...available].sort((a, b) => numberOf(b.item.annual) - numberOf(a.item.annual))[0];
    const lowest = [...available].sort((a, b) => numberOf(a.item.annual) - numberOf(b.item.annual))[0];
    const sourceAnalysis = inflationData.analysis;

    container.innerHTML = `<div class="analysis-container">
        <article class="analysis-card analysis-card-highlight"><span class="analysis-icon">🧠</span><h4>تحليل Gemini</h4><p>${sourceAnalysis || 'لا يوجد تحليل ذكي حقيقي من الخادم حاليًا.'}</p></article>
        <article class="analysis-card"><span class="analysis-icon">📌</span><h4>أعلى تضخم سنوي</h4><p>${highest ? `${highest.country.name} عند ${highest.item.annual}` : 'لا توجد بيانات كافية.'}</p><span class="analysis-value">${highest?.item.monthly || '—'} شهريًا</span></article>
        <article class="analysis-card"><span class="analysis-icon">📉</span><h4>أقل تضخم سنوي</h4><p>${lowest ? `${lowest.country.name} عند ${lowest.item.annual}` : 'لا توجد بيانات كافية.'}</p><span class="analysis-value">${lowest?.item.monthly || '—'} شهريًا</span></article>
        <article class="analysis-card"><span class="analysis-icon">ℹ️</span><h4>مصدر البيانات</h4><p>${available.length ? `تتوفر بيانات حقيقية لـ ${available.length} دول.` : 'لا توجد بيانات تضخم حقيقية متاحة من الخادم.'}</p></article>
    </div>`;
}

function numberOf(value) {
    const number = Number.parseFloat(String(value));
    return Number.isFinite(number) ? number : null;
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function showError(message) {
    const container = document.getElementById('inflationOverview');
    if (container) container.innerHTML = `<div class="error-container">${message}</div>`;
}

window.InflationPage = { loadInflationData, renderInflation };
