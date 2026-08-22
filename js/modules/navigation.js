// js/modules/navigation.js
// نظام التنقل الموحد - يدير السايد بار والتنقل بين الصفحات

// استيراد CONFIG إذا كان متاحاً
let CONFIG;
if (typeof window !== 'undefined' && window.CONFIG) {
    CONFIG = window.CONFIG;
} else if (typeof module !== 'undefined' && module.exports) {
    CONFIG = require('../config.js');
} else {
    // استخدام CONFIG الافتراضي
    CONFIG = {
        PAGE_ICONS: {
            home: 'fa-house',
            prices: 'fa-coins',
            rates: 'fa-percent',
            inflation: 'fa-chart-simple',
            news: 'fa-newspaper',
            forecast: 'fa-robot'
        },
        PAGE_LABELS: {
            home: 'الرئيسية',
            prices: 'الأسعار المباشرة',
            rates: 'أسعار الفائدة',
            inflation: 'معدلات التضخم',
            news: 'الأخبار الاقتصادية',
            forecast: 'توقعات الذكاء الاصطناعي'
        },
        PRICE_SECTIONS: [
            { id: 'gold', icon: 'fa-crown', label: 'الذهب' },
            { id: 'silver', icon: 'fa-gem', label: 'الفضة' },
            { id: 'oil', icon: 'fa-oil-can', label: 'النفط' },
            { id: 'metals', icon: 'fa-industry', label: 'المعادن' },
            { id: 'crypto', icon: 'fa-bitcoin', label: 'العملات الرقمية' },
            { id: 'fx', icon: 'fa-dollar-sign', label: 'أسعار الصرف' },
            { id: 'pairs', icon: 'fa-exchange-alt', label: 'أزواج العملات' },
            { id: 'stocks', icon: 'fa-chart-bar', label: 'مؤشرات الأسهم' },
            { id: 'fuel', icon: 'fa-gas-pump', label: 'أسعار الوقود' }
        ]
    };
}

/**
 * نظام التنقل الموحد
 */
const Navigation = {
    /**
     * الحصول على اسم الصفحة الحالية من URL
     */
    getCurrentPage: function() {
        const path = window.location.pathname.split('/').pop() || 'index.html';
        const page = path.replace('.html', '');
        // إذا كانت الصفحة الرئيسية أو فارغة
        if (page === 'index' || page === '') return 'home';
        // تحويل ai-forecast إلى forecast
        if (page === 'ai-forecast') return 'forecast';
        return page;
    },
    
    /**
     * الحصول على اسم الصفحة للعرض
     */
    getPageLabel: function(page) {
        return CONFIG.PAGE_LABELS[page] || page;
    },
    
    /**
     * الحصول على أيقونة الصفحة
     */
    getPageIcon: function(page) {
        return CONFIG.PAGE_ICONS[page] || 'fa-file';
    },
    
    /**
     * الحصول على عناصر السايد بار حسب الصفحة
     */
    getSidebarItems: function(page) {
        // جميع الصفحات عدا الرئيسية
        const allPages = [
            { id: 'prices', icon: 'fa-coins', label: 'الأسعار', href: 'prices.html' },
            { id: 'rates', icon: 'fa-percent', label: 'أسعار الفائدة', href: 'rates.html' },
            { id: 'inflation', icon: 'fa-chart-simple', label: 'التضخم', href: 'inflation.html' },
            { id: 'news', icon: 'fa-newspaper', label: 'الأخبار', href: 'news.html' },
            { id: 'forecast', icon: 'fa-robot', label: 'توقعات الذكاء', href: 'ai-forecast.html' }
        ];
        
        // إذا كانت الصفحة الرئيسية، نعرض الصفحات الأخرى
        if (page === 'home') {
            return allPages;
        }
        
        // إذا كانت صفحة الأسعار، نعرض أقسامها
        if (page === 'prices') {
            return CONFIG.PRICE_SECTIONS || [];
        }
        
        // للصفحات الأخرى، نعرض روابط للصفحات الأخرى
        return allPages;
    },
    
    /**
     * تحديث السايد بار بناءً على الصفحة الحالية
     */
    updateSidebar: function() {
        const currentPage = this.getCurrentPage();
        const items = this.getSidebarItems(currentPage);
        const sidebarMenu = document.getElementById('sidebarMenu');
        
        if (!sidebarMenu) {
            console.warn('⚠️ sidebarMenu element not found');
            return;
        }
        
        // حفظ العنصر النشط حالياً
        const currentActive = sidebarMenu.querySelector('.sidebar-item.active');
        
        sidebarMenu.innerHTML = '';
        
        // إضافة زر العودة للرئيسية في الصفحات الفرعية
        if (currentPage !== 'home') {
            const homeLi = document.createElement('li');
            homeLi.className = 'sidebar-item home-item';
            
            const homeA = document.createElement('a');
            homeA.className = 'sidebar-link';
            homeA.href = 'index.html';
            homeA.innerHTML = `<i class="fas fa-house"></i><span>الرئيسية</span>`;
            
            homeLi.appendChild(homeA);
            sidebarMenu.appendChild(homeLi);
            
            // إضافة فاصل
            const divider = document.createElement('li');
            divider.className = 'sidebar-divider';
            divider.innerHTML = '<hr>';
            sidebarMenu.appendChild(divider);
        }
        
        // إضافة عناصر القائمة
        items.forEach((item, index) => {
            const li = document.createElement('li');
            li.className = 'sidebar-item';
            
            // تحديد إذا كان العنصر نشطاً
            const isActive = this.isItemActive(item, currentPage);
            if (isActive) {
                li.classList.add('active');
            }
            
            const a = document.createElement('a');
            a.className = 'sidebar-link';
            
            if (item.href) {
                // رابط لصفحة أخرى
                a.href = item.href;
                a.innerHTML = `<i class="fas ${item.icon}"></i><span>${item.label}</span>`;
            } else {
                // رابط لقسم داخل الصفحة
                a.setAttribute('data-section', item.id);
                a.href = `#${item.id}`;
                a.innerHTML = `<i class="fas ${item.icon}"></i><span>${item.label}</span>`;
                
                // إضافة مستمع للحدث
                a.addEventListener('click', function(e) {
                    e.preventDefault();
                    const sectionId = this.getAttribute('data-section');
                    if (sectionId) {
                        Navigation.scrollToSection(sectionId);
                    }
                });
            }
            
            li.appendChild(a);
            sidebarMenu.appendChild(li);
        });
        
        // إضافة عنصر إضافي في نهاية القائمة (تحديث)
        const refreshLi = document.createElement('li');
        refreshLi.className = 'sidebar-item refresh-item';
        
        const refreshA = document.createElement('a');
        refreshA.className = 'sidebar-link';
        refreshA.href = '#';
        refreshA.innerHTML = `<i class="fas fa-sync-alt"></i><span>تحديث البيانات</span>`;
        refreshA.addEventListener('click', function(e) {
            e.preventDefault();
            if (typeof window.AT !== 'undefined' && window.AT.loadAppData) {
                window.AT.loadAppData();
                this.querySelector('i').classList.add('fa-spin');
                setTimeout(() => {
                    this.querySelector('i').classList.remove('fa-spin');
                }, 1000);
            }
        });
        
        refreshLi.appendChild(refreshA);
        sidebarMenu.appendChild(refreshLi);
        
        // استدعاء حدث التحديث
        if (typeof this.onUpdate === 'function') {
            this.onUpdate(currentPage, items);
        }
    },
    
    /**
     * التحقق من نشاط عنصر القائمة
     */
    isItemActive: function(item, currentPage) {
        // إذا كان العنصر يحتوي على href، تحقق من الصفحة
        if (item.href) {
            const page = item.href.replace('.html', '');
            return page === currentPage;
        }
        // إذا كان عنصر قسم، تحقق من الـ hash
        if (item.id) {
            const hash = window.location.hash.replace('#', '');
            return hash === item.id;
        }
        return false;
    },
    
    /**
     * التمرير إلى قسم معين
     */
    scrollToSection: function(sectionId) {
        // تحديث الـ URL
        window.location.hash = sectionId;
        
        // البحث عن العنصر
        const element = document.getElementById(sectionId);
        if (element) {
            // التمرير بسلاسة
            element.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
            
            // تحديث العنصر النشط في السايد بار
            this.updateActiveItem(sectionId);
        } else {
            console.warn(`⚠️ Section "${sectionId}" not found`);
        }
    },
    
    /**
     * تحديث العنصر النشط في السايد بار
     */
    updateActiveItem: function(sectionId) {
        const sidebarMenu = document.getElementById('sidebarMenu');
        if (!sidebarMenu) return;
        
        // إزالة النشاط من جميع العناصر
        sidebarMenu.querySelectorAll('.sidebar-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // إضافة النشاط للعنصر المطابق
        sidebarMenu.querySelectorAll('.sidebar-link').forEach(link => {
            const dataSection = link.getAttribute('data-section');
            if (dataSection === sectionId) {
                link.closest('.sidebar-item').classList.add('active');
            }
        });
    },
    
    /**
     * تهيئة نظام التنقل
     */
    init: function() {
        // تحديث السايد بار
        this.updateSidebar();
        
        // إضافة مستمع لتغيير الـ hash
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.replace('#', '');
            if (hash) {
                this.updateActiveItem(hash);
            }
        });
        
        // إضافة مستمع لحدث البيانات المحملة
        document.addEventListener('dataLoaded', () => {
            // تحديث السايد بار بعد تحميل البيانات
            this.updateSidebar();
        });
        
        console.log('✅ Navigation system initialized');
        console.log(`📄 Current page: ${this.getCurrentPage()}`);
    }
};

// ==================== EXPORTS ====================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Navigation;
}

// تصدير للاستخدام في المتصفح
if (typeof window !== 'undefined') {
    window.Navigation = Navigation;
    
    // تهيئة تلقائية عند تحميل الصفحة
    document.addEventListener('DOMContentLoaded', function() {
        Navigation.init();
    });
}


