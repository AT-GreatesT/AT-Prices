/**
 * نظام تحديث الأسعار المباشر والتنقل الذكي
 * متوافق مع Supabase Edge Functions
 */

const API_URL = "https://didrwhsltizbtyjsnokb.supabase.co/functions/v1/AT-Prices";
const REFRESH_INTERVAL = 30000; // 30 ثانية

/* ================= 1. نظام جلب الأسعار ================= */

async function fetchLivePrices() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error("Network response was not ok");
        
        const data = await response.json();

        // تحديث كل عنصر في الصفحة يطابق مفاتيح البيانات القادمة من API
        Object.keys(data).forEach(id => {
            const newValue = data[id];
            // نستخدم querySelectorAll لدعم تحديث السعر في أكثر من مكان (مثلاً الكارت والجدول)
            const elements = document.querySelectorAll(`#${id}`);
            
            elements.forEach(element => {
                if (newValue && element.innerText !== newValue) {
                    updateElementWithAnimation(element, newValue);
                }
            });
        });

        console.log(`Update successful: ${new Date().toLocaleTimeString()}`);
    } catch (error) {
        console.error("Fetch Error:", error);
    }
}

/**
 * دالة فرعية لتحديث النص مع إضافة تأثير بصري (وميض)
 */
function updateElementWithAnimation(element, value) {
    // إضافة تنعيم لتغيير اللون عبر CSS
    element.style.transition = "color 0.4s ease, transform 0.4s ease";
    
    // تغيير النص
    element.innerText = value;
    
    // تأثير الوميض والتحجيم البسيط
    element.style.color = "#ffcc00"; // لون ذهبي للتنبيه
    element.style.transform = "scale(1.05)";
    
    // العودة للحالة الأصلية بعد ثانية
    setTimeout(() => {
        element.style.color = "";
        element.style.transform = "scale(1)";
    }, 1000);
}

/* ================= 2. نظام التنقل (Navigation) ================= */

function setupNavigation() {
    // استهداف الـ Chips والـ Cards التي تحتوي على سمة data-section
    const navElements = document.querySelectorAll('.nav-chips a, [data-section]');

    navElements.forEach(element => {
        element.style.cursor = "pointer";

        element.addEventListener('click', function(e) {
            // منع الانتقال إذا كان الرابط يؤدي لصفحة أخرى، إلا إذا كان مقصوداً كـ Section
            const targetSectionId = this.getAttribute('data-section');
            
            if (targetSectionId) {
                e.preventDefault();
                openSection(targetSectionId);
                
                // تحديث التاريخ في الـ URL بدون إعادة تحميل الصفحة (اختياري)
                // history.pushState(null, null, `#${targetSectionId}`);
            }
        });
    });
}

function openSection(sectionId) {
    const allSections = document.querySelectorAll('.page-section');
    const targetEl = document.getElementById(sectionId);

    if (!targetEl) {
        console.warn(`Section "${sectionId}" not found.`);
        return;
    }

    // 1. إخفاء جميع الأقسام مع أنيميشن بسيط (إذا كنت تستخدم CSS Transitions)
    allSections.forEach(sec => {
        sec.classList.remove('active');
        sec.style.display = "none"; 
    });

    // 2. إظهار القسم المطلوب
    targetEl.style.display = "block";
    // استخدام setTimeout لضمان تفعيل الـ Transition بعد تغيير الـ display
    setTimeout(() => {
        targetEl.classList.add('active');
    }, 10);

    // 3. تحديث حالة الـ Chips العلوية
    updateActiveChips(sectionId);

    // 4. العودة لأعلى الصفحة
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateActiveChips(sectionId) {
    const allChips = document.querySelectorAll('.nav-chips a');
    allChips.forEach(chip => {
        if (chip.getAttribute('data-section') === sectionId) {
            chip.classList.add('active');
        } else {
            chip.classList.remove('active');
        }
    });
}

/* ================= 3. التشغيل عند تحميل الصفحة ================= */

document.addEventListener("DOMContentLoaded", () => {
    // 1. تشغيل نظام التنقل
    setupNavigation();

    // 2. جلب الأسعار فوراً عند التحميل
    fetchLivePrices();

    // 3. ضبط التحديث الدوري
    setInterval(fetchLivePrices, REFRESH_INTERVAL);
});



