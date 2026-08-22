// js/modules/sidebar.js
// موديول إدارة القائمة الجانبية (Sidebar)

import CONFIG from '../config.js';

/**
 * كلاس إدارة القائمة الجانبية
 */
class SidebarManager {
    constructor() {
        this.isOpen = false;
        this.sidebarElement = document.getElementById('sidebar');
        this.toggleButton = document.getElementById('sidebarToggle') || document.getElementById('sidebar-toggle');
        this.overlayElement = document.getElementById('sidebarOverlay') || document.getElementById('sidebar-overlay');
        this.activePage = this.getCurrentPage();
        
        this.init();
    }
    
    /**
     * تهيئة القائمة الجانبية
     */
    init() {
        // إنشاء العناصر إذا لم تكن موجودة
        this.createSidebarElements();
        
        // إضافة مستمعين للأحداث
        this.addEventListeners();
        
        // تفعيل العنصر النشط
        this.activateCurrentPage();
        
        // فتح القائمة على الشاشات الكبيرة
        if (window.innerWidth >= 768) {
            this.open();
        }
    }
    
    /**
     * إنشاء عناصر القائمة الجانبية إذا لم تكن موجودة
     */
    createSidebarElements() {
        // إنشاء الـ overlay إذا لم يكن موجوداً
        if (!this.overlayElement) {
            this.overlayElement = document.createElement('div');
            this.overlayElement.id = 'sidebarOverlay';
            this.overlayElement.className = 'sidebar-overlay';
            document.body.appendChild(this.overlayElement);
        }
        
        // إنشاء زر التبديل إذا لم يكن موجوداً
        if (!this.toggleButton) {
            this.toggleButton = document.createElement('button');
            this.toggleButton.id = 'sidebarToggle';
            this.toggleButton.className = 'sidebar-toggle';
            this.toggleButton.innerHTML = '☰';
            this.toggleButton.setAttribute('aria-label', 'تبديل القائمة');
            document.body.appendChild(this.toggleButton);
        }
    }
    
    /**
     * إضافة مستمعين للأحداث
     */
    addEventListeners() {
        // زر التبديل
        if (this.toggleButton) {
            this.toggleButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggle();
            });
        }
        
        // الـ overlay
        if (this.overlayElement) {
            this.overlayElement.addEventListener('click', () => {
                this.close();
            });
        }
        
        // زر الإغلاق في القائمة
        const closeBtn = document.getElementById('sidebar-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.close();
            });
        }
        
        // روابط القائمة
        const navLinks = document.querySelectorAll('.sidebar-nav a');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                // إغلاق القائمة على الشاشات الصغيرة
                if (window.innerWidth < 768) {
                    this.close();
                }
            });
        });
        
        // تغيير حجم النافذة
        window.addEventListener('resize', () => {
            if (window.innerWidth >= 768) {
                this.open();
            } else if (window.innerWidth < 768) {
                this.close();
            }
        });
        
        // إغلاق القائمة عند الضغط على Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }
    
    /**
     * الحصول على الصفحة الحالية
     */
    getCurrentPage() {
        const path = window.location.pathname;
        const pageMap = {
            '/': 'home',
            '/index.html': 'home',
            '/prices.html': 'prices',
            '/rates.html': 'rates',
            '/inflation.html': 'inflation',
            '/news.html': 'news',
            '/ai-forecast.html': 'forecast'
        };
        return pageMap[path] || 'home';
    }
    
    /**
     * تفعيل الصفحة الحالية في القائمة
     */
    activateCurrentPage() {
        const navLinks = document.querySelectorAll('.sidebar-nav a');
        navLinks.forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href');
            if (href && href.includes(this.activePage)) {
                link.classList.add('active');
            }
        });
    }
    
    /**
     * فتح القائمة الجانبية
     */
    open() {
        if (this.sidebarElement) {
            this.sidebarElement.classList.add('open');
        }
        if (this.overlayElement) {
            this.overlayElement.classList.toggle('active', window.innerWidth < 768);
        }
        this.isOpen = true;
        document.body.style.overflow = window.innerWidth < 768 ? 'hidden' : '';
    }
    
    /**
     * إغلاق القائمة الجانبية
     */
    close() {
        if (this.sidebarElement) {
            this.sidebarElement.classList.remove('open');
        }
        if (this.overlayElement) {
            this.overlayElement.classList.remove('active');
        }
        this.isOpen = false;
        document.body.style.overflow = '';
    }
    
    /**
     * تبديل حالة القائمة الجانبية
     */
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }
    
    /**
     * تحديث عناصر القائمة (للصفحات الديناميكية)
     */
    updateNavItems() {
        this.activateCurrentPage();
    }
}

/**
 * إنشاء بنية القائمة الجانبية
 * @param {string} activePage - الصفحة النشطة
 * @returns {string} - HTML للقائمة
 */
function createSidebarHTML(activePage = 'home') {
    const pages = [
        { id: 'home', icon: '🏠', label: 'الرئيسية', href: 'index.html' },
        { id: 'prices', icon: '📊', label: 'الأسعار المباشرة', href: 'prices.html' },
        { id: 'rates', icon: '📈', label: 'أسعار الفائدة', href: 'rates.html' },
        { id: 'inflation', icon: '📉', label: 'معدلات التضخم', href: 'inflation.html' },
        { id: 'news', icon: '📰', label: 'الأخبار الاقتصادية', href: 'news.html' },
        { id: 'forecast', icon: '🤖', label: 'توقعات الذكاء الاصطناعي', href: 'ai-forecast.html' }
    ];
    
    let html = `
        <div id="sidebar" class="sidebar">
            <div class="sidebar-header">
                <h2>AT Financial</h2>
                <button id="sidebar-close" class="sidebar-close">×</button>
            </div>
            <nav class="sidebar-nav">
                <ul>
    `;
    
    pages.forEach(page => {
        const isActive = page.id === activePage ? 'active' : '';
        html += `
            <li>
                <a href="${page.href}" class="${isActive}" data-page="${page.id}">
                    <span class="nav-icon">${page.icon}</span>
                    <span class="nav-label">${page.label}</span>
                </a>
            </li>
        `;
    });
    
    html += `
                </ul>
            </nav>
            <div class="sidebar-footer">
                <div class="sidebar-version">v1.0.0</div>
                <div class="sidebar-status" id="connection-status">
                    <span class="status-dot online"></span>
                    متصل
                </div>
            </div>
        </div>
        <div id="sidebar-overlay" class="sidebar-overlay"></div>
    `;
    
    return html;
}

function renderSidebarItems(activePage = 'home') {
    const menu = document.getElementById('sidebarMenu');
    if (!menu) return;

    if (activePage === 'prices') {
        const sections = [
            { id: 'gold', icon: '🥇', label: 'أسعار الذهب' },
            { id: 'silver', icon: '🥈', label: 'أسعار الفضة' },
            { id: 'oil', icon: '🛢️', label: 'أسعار النفط' },
            { id: 'metals', icon: '💎', label: 'المعادن الثمينة' },
            { id: 'crypto', icon: '₿', label: 'العملات الرقمية' },
            { id: 'fx', icon: '💱', label: 'أسعار الصرف' },
            { id: 'pairs', icon: '🔄', label: 'أزواج العملات' },
            { id: 'stocks', icon: '📈', label: 'مؤشرات الأسهم' },
            { id: 'fuel', icon: '⛽', label: 'أسعار الوقود' }
        ];

        menu.innerHTML = `
            <li class="sidebar-item sidebar-back-item">
                <a href="index.html" class="sidebar-link">
                    <span class="nav-icon">🏠</span><span class="nav-label">الرئيسية</span>
                </a>
            </li>
            <li class="sidebar-divider"><hr></li>
            ${sections.map((section, index) => `
                <li class="sidebar-item${index === 0 ? ' active' : ''}">
                    <a href="javascript:void(0)" class="sidebar-link" data-section="${section.id}">
                        <span class="nav-icon">${section.icon}</span>
                        <span class="nav-label">${section.label}</span>
                    </a>
                </li>
            `).join('')}
        `;
        return;
    }

    if (activePage === 'rates') {
        const sections = [
            { id: 'overview', icon: '📊', label: 'ملخص أسعار الفائدة' },
            { id: 'analysis', icon: '🧠', label: 'التحليل الذكي' },
            { id: 'details', icon: '🏦', label: 'تفاصيل أسعار الفائدة' },
            { id: 'comparison', icon: '📈', label: 'مقارنة أسعار الفائدة' },
            { id: 'history', icon: '📅', label: 'تاريخ أسعار الفائدة' }
        ];

        menu.innerHTML = `
            <li class="sidebar-item sidebar-back-item">
                <a href="index.html" class="sidebar-link">
                    <span class="nav-icon">🏠</span><span class="nav-label">الرئيسية</span>
                </a>
            </li>
            <li class="sidebar-divider"><hr></li>
            ${sections.map((section, index) => `
                <li class="sidebar-item${index === 0 ? ' active' : ''}">
                    <a href="javascript:void(0)" class="sidebar-link" data-rate-section="${section.id}">
                        <span class="nav-icon">${section.icon}</span>
                        <span class="nav-label">${section.label}</span>
                    </a>
                </li>
            `).join('')}
        `;
        return;
    }

    if (activePage === 'inflation') {
        const sections = [
            { id: 'overview', icon: '📉', label: 'معدلات التضخم' },
            { id: 'details', icon: '📊', label: 'ملخص التضخم' },
            { id: 'comparison', icon: '⚖️', label: 'مقارنة التضخم' },
            { id: 'analysis', icon: '🧠', label: 'التحليل الذكي - Gemini' }
        ];

        menu.innerHTML = `
            <li class="sidebar-item sidebar-back-item">
                <a href="index.html" class="sidebar-link">
                    <span class="nav-icon">🏠</span><span class="nav-label">الرئيسية</span>
                </a>
            </li>
            <li class="sidebar-divider"><hr></li>
            ${sections.map((section, index) => `
                <li class="sidebar-item${index === 0 ? ' active' : ''}">
                    <a href="javascript:void(0)" class="sidebar-link" data-inflation-section="${section.id}">
                        <span class="nav-icon">${section.icon}</span>
                        <span class="nav-label">${section.label}</span>
                    </a>
                </li>
            `).join('')}
        `;
        return;
    }

    if (activePage === 'news') {
        const sections = [
            { id: 'all', icon: '📰', label: 'كل الأخبار' },
            { id: 'metals', icon: '💎', label: 'أخبار المعادن' },
            { id: 'oil', icon: '🛢️', label: 'أخبار النفط' },
            { id: 'forex', icon: '💱', label: 'أخبار العملات' },
            { id: 'crypto', icon: '₿', label: 'أخبار العملات الرقمية' },
            { id: 'economy', icon: '📊', label: 'أخبار الاقتصاد' },
            { id: 'stocks', icon: '📈', label: 'أخبار الأسهم' },
            { id: 'analysis', icon: '🧠', label: 'التحليل الذكي' }
        ];

        menu.innerHTML = `
            <li class="sidebar-item sidebar-back-item">
                <a href="index.html" class="sidebar-link">
                    <span class="nav-icon">🏠</span><span class="nav-label">الرئيسية</span>
                </a>
            </li>
            <li class="sidebar-divider"><hr></li>
            ${sections.map((section, index) => `
                <li class="sidebar-item${index === 0 ? ' active' : ''}">
                    <a href="javascript:void(0)" class="sidebar-link" data-news-section="${section.id}">
                        <span class="nav-icon">${section.icon}</span>
                        <span class="nav-label">${section.label}</span>
                    </a>
                </li>
            `).join('')}
        `;
        return;
    }

    if (activePage === 'forecast') {
        const sections = [
            { id: 'metrics', icon: '📊', label: 'مقاييس السوق' },
            { id: 'insights', icon: '💡', label: 'رؤى السوق' },
            { id: 'sentiment', icon: '😊', label: 'تحليل المشاعر' },
            { id: 'recommendations', icon: '💎', label: 'التوصيات الذكية' },
            { id: 'signals', icon: '📡', label: 'إشارات السوق' }
        ];

        menu.innerHTML = `
            <li class="sidebar-item sidebar-back-item">
                <a href="index.html" class="sidebar-link">
                    <span class="nav-icon">🏠</span><span class="nav-label">الرئيسية</span>
                </a>
            </li>
            <li class="sidebar-divider"><hr></li>
            ${sections.map((section, index) => `
                <li class="sidebar-item${index === 0 ? ' active' : ''}">
                    <a href="javascript:void(0)" class="sidebar-link" data-forecast-section="${section.id}">
                        <span class="nav-icon">${section.icon}</span>
                        <span class="nav-label">${section.label}</span>
                    </a>
                </li>
            `).join('')}
        `;
        return;
    }

    const pageLinks = [
        { id: 'home', icon: '🏠', label: 'الرئيسية', href: 'index.html' },
        { id: 'prices', icon: '📊', label: 'الأسعار المباشرة', href: 'prices.html' },
        { id: 'rates', icon: '📈', label: 'أسعار الفائدة', href: 'rates.html' },
        { id: 'inflation', icon: '📉', label: 'معدلات التضخم', href: 'inflation.html' },
        { id: 'news', icon: '📰', label: 'الأخبار الاقتصادية', href: 'news.html' },
        { id: 'forecast', icon: '🤖', label: 'توقعات الذكاء الاصطناعي', href: 'ai-forecast.html' }
    ];
    menu.innerHTML = pageLinks.map(page => `
        <li class="sidebar-item${page.id === activePage ? ' active' : ''}">
            <a href="${page.href}" class="sidebar-link" data-page="${page.id}">
                <span class="nav-icon">${page.icon}</span><span class="nav-label">${page.label}</span>
            </a>
        </li>
    `).join('');
}

/**
 * تهيئة القائمة الجانبية في الصفحة
 * @param {string} activePage - الصفحة النشطة
 */
function initSidebar(activePage = 'home') {
    // إضافة HTML للقائمة إذا لم تكن موجودة
    if (!document.getElementById('sidebar')) {
        const sidebarHTML = createSidebarHTML(activePage);
        document.body.insertAdjacentHTML('afterbegin', sidebarHTML);
    }

    renderSidebarItems(activePage);
    
    // إنشاء مدير القائمة
    const sidebarManager = new SidebarManager();
    
    // تصدير المدير للاستخدام العالمي
    window.sidebarManager = sidebarManager;
    
    return sidebarManager;
}

// تصدير للاستخدام
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SidebarManager,
        createSidebarHTML,
        initSidebar
    };
}

// تصدير للاستخدام في المتصفح
window.SidebarModule = {
    SidebarManager,
    createSidebarHTML,
    initSidebar
};

export { SidebarManager, createSidebarHTML, initSidebar };

console.log('✅ Sidebar module loaded successfully');


