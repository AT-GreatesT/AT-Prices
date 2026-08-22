import { CONFIG } from './config.js';

/* ================= DARK / LIGHT THEME TOGGLE ================= */
export function initThemeToggle() {
  const themeToggleBtn = document.getElementById('themeToggle');
  const savedTheme = localStorage.getItem('theme') || 'light';

  document.documentElement.setAttribute('data-theme', savedTheme);
  if (themeToggleBtn) themeToggleBtn.querySelector('i')?.classList.toggle('fa-sun', savedTheme === 'dark');
}

/* ================= AUTOMATIC TRANSLATION ENGINE ================= */
export function initAutoTranslate() {
  window.googleTranslateElementInit = function() {
    new window.google.translate.TranslateElement({
      pageLanguage: 'ar',
      includedLanguages: CONFIG.SUPPORTED_LANGS.map(l => l.code).join(','),
      autoDisplay: false
    }, 'google_translate_element');
  };

  if (!document.getElementById('google-translate-script')) {
    const script = document.createElement('script');
    script.id = 'google-translate-script';
    script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    document.body.appendChild(script);
  }
}

export function changeLanguage(langCode) {
  const langConfig = CONFIG.SUPPORTED_LANGS.find(l => l.code === langCode);
  if (!langConfig) return;

  document.documentElement.lang = langCode;
  document.documentElement.dir = langConfig.dir;
  localStorage.setItem('app_lang', langCode);

  const googleLangCode = langCode === 'zh' ? 'zh-CN' : langCode;
  const selectEl = document.querySelector('.goog-te-combo');
  if (selectEl) {
    selectEl.value = langCode === 'ar' ? '' : googleLangCode;
    selectEl.dispatchEvent(new Event('change'));
  }
}

function initLanguageControls() {
  document.querySelectorAll('.lang-option').forEach(option => {
    option.addEventListener('click', () => {
      const langCode = option.dataset.lang;
      changeLanguage(langCode);

      // Google creates its select asynchronously, so apply the choice once it exists.
      let attempts = 0;
      const applyWhenReady = window.setInterval(() => {
        const selectEl = document.querySelector('.goog-te-combo');
        if (selectEl || attempts++ > 20) {
          window.clearInterval(applyWhenReady);
          if (selectEl) {
            selectEl.value = langCode === 'zh' ? 'zh-CN' : langCode;
            selectEl.dispatchEvent(new Event('change'));
          }
        }
      }, 100);
    });
  });
}

/* ================= SCROLL TO TOP BUTTON ================= */
function initScrollTop() {
  let scrollTopBtn = document.getElementById('scrollTopBtn');
  if (!scrollTopBtn) {
    scrollTopBtn = document.createElement('button');
    scrollTopBtn.id = 'scrollTopBtn';
    scrollTopBtn.className = 'scroll-top-btn';
    scrollTopBtn.type = 'button';
    scrollTopBtn.setAttribute('aria-label', 'العودة إلى أعلى الصفحة');
    scrollTopBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
    document.body.appendChild(scrollTopBtn);
  }

  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      scrollTopBtn.classList.add('visible');
    } else {
      scrollTopBtn.classList.remove('visible');
    }
  });

  scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
}

/* ================= INITIALIZATION ================= */
document.addEventListener('DOMContentLoaded', () => {
  // إضافة حاوية عنصر ترجمة جوجل مخفية
  if (!document.getElementById('google_translate_element')) {
    const gtDiv = document.createElement('div');
    gtDiv.id = 'google_translate_element';
    document.body.appendChild(gtDiv);
  }

  initThemeToggle();
  initAutoTranslate();
  initLanguageControls();
  initScrollTop();

  // ضبط اللغة المحفوظة
  const savedLang = localStorage.getItem('app_lang') || localStorage.getItem('language') || CONFIG.DEFAULT_LANG;
  const langSelector = document.getElementById('langSelector');
  if (langSelector) {
    langSelector.value = savedLang;
    langSelector.addEventListener('change', (e) => changeLanguage(e.target.value));
  }

  const savedOption = document.querySelector(`.lang-option[data-lang="${savedLang}"]`);
  if (savedOption) {
    savedOption.classList.add('active');
    const currentLangLabel = document.getElementById('currentLangLabel');
    if (currentLangLabel) currentLangLabel.textContent = savedOption.textContent.trim();
  }
});



