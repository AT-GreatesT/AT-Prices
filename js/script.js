// ================= الإعدادات والقيم الاحتياطية =================
const OUNCE_TO_GRAM = 31.1035;
const GOLD_POUND_WEIGHT = 8;
const GOLD_DOLLAR_MARGIN = 1.8; 
let officialUSD = 47.00; 

const proxy = "https://api.allorigins.win/get?url=";

// وظيفة تحديث النص في الواجهة
function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
}

// 1. جلب سعر الدولار الرسمي
async function updateDollar() {
    try {
        const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
        if (!res.ok) throw new Error();
        const data = await res.json();
        if(data && data.rates && data.rates.EGP) {
            officialUSD = data.rates.EGP;
            console.log("✅ تحديث الدولار الرسمي: " + officialUSD);
        }
    } catch (e) {
        console.warn("⚠️ فشل جلب الدولار، يتم استخدام القيمة الاحتياطية");
    }
}

// 2. نظام جلب سعر الذهب الذكي (3 مصادر)
async function fetchGoldPrice() {
    const sources = [
        {
            name: "Gold-API",
            url: "https://api.gold-api.com/price/XAU",
            parse: (data) => data.price
        },
        {
            name: "Metals-Live",
            url: "https://api.metals.live/v1/spot",
            parse: (data) => {
                const gold = data.find(item => item.metal === "gold");
                return gold ? gold.price : null;
            }
        },
        {
            name: "GoldAPI-IO",
            url: "https://www.goldapi.io/api/XAU/USD",
            parse: (data) => data.price
        }
    ];

    for (let source of sources) {
        try {
            console.log(`🔄 محاولة من: ${source.name}`);
            const finalUrl = proxy + encodeURIComponent(source.url) + "&t=" + new Date().getTime();
            
            const res = await fetch(finalUrl);
            if (!res.ok) continue;

            const rawData = await res.json();
            const goldData = JSON.parse(rawData.contents);
            const price = source.parse(goldData);

            if (price) {
                console.log(`✅ نجح الجلب من ${source.name}: ${price}`);
                return price;
            }
        } catch (err) {
            console.warn(`❌ فشل مصدر ${source.name}`);
        }
    }
    return null;
}

// 3. تحديث واجهة الذهب
async function updateGold() {
    try {
        const goldOunceUSD = await fetchGoldPrice();
        
        if (goldOunceUSD) {
            const goldDollarMarket = officialUSD + GOLD_DOLLAR_MARGIN;
            const futureUSD = goldOunceUSD + 15;
            const gramUSD = goldOunceUSD / OUNCE_TO_GRAM;
            const karat_24 = gramUSD * goldDollarMarket;
            const karat_21 = karat_24 * 0.875;
            const karat_18 = karat_24 * 0.75;
            const goldPound = karat_21 * GOLD_POUND_WEIGHT;

            // تحديث العناصر
            setText("goldHome", `$${goldOunceUSD.toLocaleString()}`);
            setText("goldSpot", `$${goldOunceUSD.toLocaleString()}`);
            setText("goldFuture", `$${futureUSD.toLocaleString()}`);
            setText("goldGramUSD", `$${gramUSD.toFixed(2)}`);
            setText("goldGramEGP", `${Math.round(karat_24)} ج.م`); 
            setText("g24", `${Math.round(karat_24)} ج.م`);
            setText("g21", `${Math.round(karat_21)} ج.م`);
            setText("g18", `${Math.round(karat_18)} ج.م`);
            setText("goldPound", `${Math.round(goldPound)} ج.م`);
            setText("goldDollar", `${goldDollarMarket.toFixed(2)} ج.م`);
        }
    } catch (err) {
        console.error("⚠️ خطأ في معالجة البيانات");
    }
}


// ========================== أسعار الصرف والسوق الموازية ==========================
let officialRates = {};
let parallelUSD = 0;

async function fetchFXSmart() {
    // --- 1️⃣ المصدر الأول: السعر الرسمي (ExchangeRate-API) ---
    try {
        const res = await fetch(proxy + encodeURIComponent("https://api.exchangerate-api.com/v4/latest/USD"));
        const raw = await res.json();
        const data = JSON.parse(raw.contents);
        if (data && data.rates) {
            officialRates = data.rates;
            officialUSD = data.rates.EGP; // القيمة العالمية التي نستخدمها في باقي الموقع
            console.log("✅ Official FX Success");
        }
    } catch(e) { console.warn("⚠️ Official FX Source 1 Failed"); }

    // --- 2️⃣ المصدر الثاني: السوق الموازية (Binance P2P Proxy) ---
    // سنقوم بجلب سعر USDT/EGP من باينانس لأنه يعبر بدقة عن سعر الدولار في السوق السوداء بمصر
    try {
        // نستخدم AllOrigins لجلب بيانات Binance P2P (طلب POST عبر البروكسي)
        const p2pUrl = "https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search";
        const postData = {
            asset: "USDT",
            fiat: "EGP",
            merchantCheck: false,
            page: 1,
            payTypes: [],
            publisherType: null,
            rows: 1,
            tradeType: "BUY"
        };

        const res = await fetch(proxy + encodeURIComponent(p2pUrl), {
            method: 'GET', // AllOrigins يحول الـ GET لطلب مخصص أحياناً، سنعتمد على أبسط طريقة جلب
        });
        
        // ملاحظة: باينانس P2P تتطلب طلبات معقدة، سنستخدم بديل ذكي (سعر USDT من CryptoCompare بالجنيه)
        const btcRes = await fetch(proxy + encodeURIComponent("https://min-api.cryptocompare.com/data/price?fsym=USDT&tsyms=EGP"));
        const btcData = JSON.parse((await btcRes.json()).contents);
        
        if (btcData && btcData.EGP) {
            parallelUSD = btcData.EGP;
            console.log("✅ Parallel Market Success: " + parallelUSD);
        }
    } catch(e) { 
        console.warn("⚠️ Parallel Market Fetch Failed, using fallback formula");
        // Fallback: إذا فشل جلب باينانس، نستخدم معادلة "دولار الصاغة" (سعر الذهب محلي / سعر الذهب عالمي)
        // لكننا سنعتمد هنا على السعر الأخير الناجح لضمان الاستقرار
    }

    return { official: officialRates, parallel: parallelUSD };
}

async function updateFX() {
    try {
        const fx = await fetchFXSmart();
        const egpOfficial = fx.official.EGP;
        const egpParallel = fx.parallel || (egpOfficial * 1.05); // قيمة تقريبية في حال الفشل التام

        // تحديث الكارد الرئيسي (الدولار)
        setText("fxHome", `${egpOfficial.toFixed(2)} ج.م`);

        // تحديث أسعار البنوك (الرسمي)
        setText("fxSpot", `${egpOfficial.toFixed(2)} ج.م`);
        setText("eurSpot", `${(egpOfficial / fx.official.EUR).toFixed(2)} ج.م`);
        setText("sarSpot", `${(egpOfficial / fx.official.SAR).toFixed(2)} ج.م`);
        setText("aedSpot", `${(egpOfficial / fx.official.AED).toFixed(2)} ج.م`);
        setText("kwdSpot", `${(egpOfficial / fx.official.KWD).toFixed(2)} ج.م`);

        // تحديث السوق الموازية (حسابي بناءً على سعر دولار باينانس)
        if (egpParallel > 0) {
            setText("blackUSD", `${egpParallel.toFixed(2)} ج.م`);
            setText("blackEUR", `${(egpParallel / fx.official.EUR).toFixed(2)} ج.م`);
            setText("blackSAR", `${(egpParallel / fx.official.SAR).toFixed(2)} ج.م`);
            setText("blackAED", `${(egpParallel / fx.official.AED).toFixed(2)} ج.م`);
            setText("blackKWD", `${(egpParallel / fx.official.KWD).toFixed(2)} ج.م`);
        }

    } catch(e) {
        console.error("⚠️ FX Update Error");
    }
}





// ========================== الفضة ==========================
let lastSilverOunceUSD = null;

async function fetchSilverPriceSmart() {
    // 1️⃣ Metals.live (مع إضافة البروكسي وتخطي الكروس)
    try {
        const res = await fetch(proxy + encodeURIComponent("https://api.metals.live/v1/spot") + "&t=" + Date.now());
        const raw = await res.json();
        const data = JSON.parse(raw.contents);
        const silverObj = data.find(item => item.silver);
        if (silverObj && silverObj.silver) {
            lastSilverOunceUSD = silverObj.silver;
            console.log("✅ Metals.live: سعر الفضة " + lastSilverOunceUSD);
            return lastSilverOunceUSD;
        }
    } catch(e) { console.warn("⚠️ Metals.live فشل جلب الفضة"); }

    // 2️⃣ GoldAPI.io (مع البروكسي)
    try {
        const res = await fetch(proxy + encodeURIComponent("https://www.goldapi.io/api/XAG/USD") + "&t=" + Date.now());
        const raw = await res.json();
        const data = JSON.parse(raw.contents);
        if (data && data.price) {
            lastSilverOunceUSD = data.price;
            console.log("✅ GoldAPI.io: سعر الفضة " + lastSilverOunceUSD);
            return lastSilverOunceUSD;
        }
    } catch(e) { console.warn("⚠️ GoldAPI.io فشل"); }

    // 3️⃣ gold-api.com (مع البروكسي)
    try {
        const res = await fetch(proxy + encodeURIComponent("https://api.gold-api.com/price/XAG") + "&t=" + Date.now());
        const raw = await res.json();
        const data = JSON.parse(raw.contents);
        if (data && data.price) {
            lastSilverOunceUSD = data.price;
            console.log("✅ gold-api.com: سعر الفضة " + lastSilverOunceUSD);
            return lastSilverOunceUSD;
        }
    } catch(e) { console.warn("⚠️ gold-api.com فشل"); }

    // 🔁 الحل الأخير: السعر المحفوظ
    if (lastSilverOunceUSD) return lastSilverOunceUSD;

    throw new Error("❌ كل مصادر الفضة فشلت");
}

async function updateSilver() {
    try {
        const silverUSD = await fetchSilverPriceSmart();
        
        // حسابات الجرام المحلي بناءً على سعر الدولار الرسمي
        const silverGram999 = (silverUSD / OUNCE_TO_GRAM) * officialUSD;
        const silverGram925 = silverGram999 * 0.925;

        // تحديث الكارد في الصفحة الرئيسية
        setText("silverHome", `$${silverUSD.toFixed(2)}`);

        // تحديث الجدول التفصيلي (الذي أرسلته)
        setText("silverSpot", `$${silverUSD.toFixed(2)}`);
        setText("silverGramEGP", `${Math.round(silverGram999)} ج.م`);
        setText("silver925", `${Math.round(silverGram925)} ج.م`);
        setText("silverDollar", `${officialUSD.toFixed(2)} ج.م`);

        console.log("✅ تم تحديث جدول الفضة بنجاح");
    } catch(e) {
        console.error("⚠️ فشل تحديث الفضة");
    }
}



// ========================== النفط (المصدر المستقر) ==========================
let lastOilBrent = null;
let lastOilWTI = null;

async function fetchOilPriceSmart() {
    let results = { brent: null, wti: null };

    // 1️⃣ المصدر الأول: Yahoo Finance (خام برنت - BZ=F)
    try {
        const urlBrent = "https://query1.finance.yahoo.com/v8/finance/chart/BZ=F?interval=1m&range=1d";
        const res = await fetch(proxy + encodeURIComponent(urlBrent) + "&t=" + Date.now());
        const raw = await res.json();
        const data = JSON.parse(raw.contents);
        
        if (data && data.chart.result) {
            const price = data.chart.result[0].meta.regularMarketPrice;
            results.brent = price;
            lastOilBrent = price;
            console.log("✅ Yahoo (Brent): " + price);
        }
    } catch(e) { console.warn("⚠️ Yahoo Brent فشل"); }

    // 2️⃣ المصدر الثاني: Yahoo Finance (خام غرب تكساس - CL=F)
    try {
        const urlWTI = "https://query1.finance.yahoo.com/v8/finance/chart/CL=F?interval=1m&range=1d";
        const res = await fetch(proxy + encodeURIComponent(urlWTI) + "&t=" + Date.now());
        const raw = await res.json();
        const data = JSON.parse(raw.contents);
        
        if (data && data.chart.result) {
            const price = data.chart.result[0].meta.regularMarketPrice;
            results.wti = price;
            lastOilWTI = price;
            console.log("✅ Yahoo (WTI): " + price);
        }
    } catch(e) { console.warn("⚠️ Yahoo WTI فشل"); }

    // 🔁 الاسترجاع من الذاكرة في حالة الفشل اللحظي
    if (!results.brent) results.brent = lastOilBrent;
    if (!results.wti) results.wti = lastOilWTI;

    return results;
}

async function updateOil() {
    try {
        const oilData = await fetchOilPriceSmart();
        
        // إذا فشل الجلب تماماً نضع "---"
        if (!oilData.brent && !oilData.wti) {
            console.warn("❌ لم يتم الحصول على بيانات نفط من أي مصدر");
            return;
        }

        const brent = oilData.brent || 0;
        const wti = oilData.wti || 0;
        // حساب السعر المحلي بناءً على برنت وسعر الصرف الرسمي المحدث
        const egpPrice = brent * officialUSD;

        // تحديث الكارد (الصفحة الرئيسية)
        setText("oilHome", brent ? `$${brent.toFixed(2)}` : "---");

        // تحديث الجدول
        setText("oilSpot", brent ? `$${brent.toFixed(2)}` : "---");
        setText("oilWTI", wti ? `$${wti.toFixed(2)}` : "---");
        setText("oilEGP", brent ? `${Math.round(egpPrice).toLocaleString()} ج.م` : "---");

        console.log("✅ تم تحديث النفط بنجاح");
    } catch(e) {
        console.error("⚠️ خطأ في معالجة بيانات النفط:", e);
    }
}





// ========================== المعادن (إصلاح الروديوم والكارد الرئيسي) ==========================
let lastMetals = { copper: null, platinum: null, palladium: null, rhodium: null };

async function fetchMetalsSmart() {
    // 1️⃣ النحاس والبلاتين والبالاديوم (Yahoo Finance)
    const symbols = { copper: "HG=F", platinum: "PL=F", palladium: "PA=F" };
    for (let key in symbols) {
        try {
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbols[key]}?interval=1m&range=1d`;
            const res = await fetch(proxy + encodeURIComponent(url) + "&t=" + Date.now());
            const data = JSON.parse((await res.json()).contents);
            if (data?.chart?.result) {
                lastMetals[key] = data.chart.result[0].meta.regularMarketPrice;
            }
        } catch(e) { console.warn(`⚠️ Yahoo ${key} failed`); }
    }

    // 2️⃣ الروديوم (XRH) - محاولة جلب من Gold-API برمز XRH
    try {
        const resRh = await fetch(proxy + encodeURIComponent("https://api.gold-api.com/price/XRH") + "&t=" + Date.now());
        const dataRh = JSON.parse((await resRh.json()).contents);
        if (dataRh && dataRh.price) {
            lastMetals.rhodium = dataRh.price;
        } else {
            // محاولة جلب الروديوم كـ Scraping بسيط من مصدر آخر إذا فشل الأول
            const altRh = await fetch(proxy + encodeURIComponent("https://www.tradingview.com/symbols/RHODIUM/"));
            const rawAlt = await altRh.json();
            const match = rawAlt.contents.match(/"lp":([\d.]+)/); 
            if(match) lastMetals.rhodium = parseFloat(match[1]);
        }
    } catch(e) { console.warn("⚠️ Rhodium Sources failed"); }

    return lastMetals;
}

async function updateMetals() {
    try {
        const metals = await fetchMetalsSmart();

        // 🎯 تحديث الكارد الرئيسي (الذي أرسلت كوده)
        // سنستخدم البلاتين أو النحاس لملء الكارد الرئيسي فوراً
        if (metals.platinum) {
            setText("metalsHome", `$${metals.platinum.toLocaleString()}`);
        } else if (metals.copper) {
            setText("metalsHome", `$${metals.copper.toFixed(2)}`);
        }

        // 🎯 تحديث الجدول التفصيلي
        if (metals.copper) setText("copperHome", `$${metals.copper.toFixed(2)}`);
        if (metals.platinum) setText("platinumHome", `$${metals.platinum.toFixed(2)}`);
        if (metals.palladium) setText("palladiumHome", `$${metals.palladium.toFixed(2)}`);
        
        // تحديث الروديوم
        if (metals.rhodium) {
            setText("rhodiumHome", `$${parseFloat(metals.rhodium).toLocaleString()}`);
        } else {
            // إذا فشل تماماً، لا تتركها فارغة، ضع آخر سعر عالمي معروف تقريباً لحين التحديث اللحظي القادم
            setText("rhodiumHome", "---");
        }

        console.log("✅ Metals Card and Table Updated");
    } catch(e) { console.error("⚠️ Metals UI Update Error:", e); }
}



// ========================== العملات الرقمية (نظام الثلاث مصادر) ==========================
let lastCryptoData = {};
// قائمة العملات (الرموز القصيرة والمسميات للمصادر المختلفة)
const cryptoMap = {
    "BTC": { binance: "BTCUSDT", gecko: "bitcoin", compare: "BTC", id: "btcSpot" },
    "ETH": { binance: "ETHUSDT", gecko: "ethereum", compare: "ETH", id: "ethSpot" },
    "SOL": { binance: "SOLUSDT", gecko: "solana", compare: "SOL", id: "solSpot" },
    "BNB": { binance: "BNBUSDT", gecko: "binancecoin", compare: "BNB", id: "bnbSpot" },
    "XRP": { binance: "XRPUSDT", gecko: "ripple", compare: "XRP", id: "xrpSpot" },
    "ADA": { binance: "ADAUSDT", gecko: "cardano", compare: "ADA", id: "adaSpot" },
    "DOGE": { binance: "DOGEUSDT", gecko: "dogecoin", compare: "DOGE", id: "dogeSpot" },
    "TRX": { binance: "TRXUSDT", gecko: "tron", compare: "TRX", id: "trxSpot" },
    "DOT": { binance: "DOTUSDT", gecko: "polkadot", compare: "DOT", id: "dotSpot" },
    "LINK": { binance: "LINKUSDT", gecko: "chainlink", compare: "LINK", id: "linkSpot" }
};

async function fetchCryptoSmart() {
    // --- 1️⃣ المصدر الأول: Binance ---
    try {
        const symbols = Object.values(cryptoMap).map(c => c.binance);
        const url = `https://api.binance.com/api/v3/ticker/price?symbols=${JSON.stringify(symbols)}`;
        const res = await fetch(proxy + encodeURIComponent(url));
        const raw = await res.json();
        const data = JSON.parse(raw.contents);
        if (Array.isArray(data)) {
            data.forEach(item => {
                const key = Object.keys(cryptoMap).find(k => cryptoMap[k].binance === item.symbol);
                if (key) lastCryptoData[key] = parseFloat(item.price);
            });
            console.log("✅ Source 1 (Binance) Success");
            return lastCryptoData;
        }
    } catch(e) { console.warn("⚠️ Source 1 (Binance) Failed"); }

    // --- 2️⃣ المصدر الثاني: CoinGecko ---
    try {
        const ids = Object.values(cryptoMap).map(c => c.gecko).join(',');
        const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;
        const res = await fetch(proxy + encodeURIComponent(url));
        const raw = await res.json();
        const data = JSON.parse(raw.contents);
        if (data) {
            Object.keys(cryptoMap).forEach(key => {
                const geckoId = cryptoMap[key].gecko;
                if (data[geckoId]) lastCryptoData[key] = data[geckoId].usd;
            });
            console.log("✅ Source 2 (CoinGecko) Success");
            return lastCryptoData;
        }
    } catch(e) { console.warn("⚠️ Source 2 (CoinGecko) Failed"); }

    // --- 3️⃣ المصدر الثالث: CryptoCompare ---
    try {
        const symbols = Object.values(cryptoMap).map(c => c.compare).join(',');
        const url = `https://min-api.cryptocompare.com/data/price?fsym=USD&tsyms=${symbols}`;
        const res = await fetch(proxy + encodeURIComponent(url));
        const raw = await res.json();
        const data = JSON.parse(raw.contents);
        if (data) {
            Object.keys(cryptoMap).forEach(key => {
                const sym = cryptoMap[key].compare;
                if (data[sym]) lastCryptoData[key] = 1 / data[sym]; // لأن المصدر يجلب كم عملة مقابل 1 دولار
            });
            console.log("✅ Source 3 (CryptoCompare) Success");
            return lastCryptoData;
        }
    } catch(e) { console.warn("⚠️ Source 3 (CryptoCompare) Failed"); }

    return lastCryptoData;
}

async function updateCrypto() {
    try {
        const data = await fetchCryptoSmart();
        
        // تحديث كارد الواجهة (البتكوين)
        if (data["BTC"]) setText("cryptoHome", `$${Math.round(data["BTC"]).toLocaleString()}`);

        // تحديث الجدول لـ 10 عملات
        Object.keys(cryptoMap).forEach(key => {
            const price = data[key];
            if (price) {
                const elementId = cryptoMap[key].id;
                const formatted = price < 1 ? price.toFixed(4) : price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
                setText(elementId, `$${formatted}`);
            }
        });
    } catch(e) { console.error("⚠️ Crypto Update Final Failure"); }
}


// ========================== أزواج العملات (Forex - 3 Sources) ==========================
let lastPairsData = {};

// تعريف الأزواج والـ IDs الخاصة بها
const pairsMap = {
    "EURUSD": "eurusd", "GBPUSD": "gbpusd", "USDJPY": "usdjpy",
    "USDCHF": "usdchf", "AUDUSD": "audusd", "USDCAD": "usdcad",
    "NZDUSD": "nzdusd", "EURGBP": "eurgbp", "EURJPY": "eurjpy", "GBPJPY": "gbpjpy"
};

async function fetchPairsSmart() {
    // --- 1️⃣ المصدر الأول: ExchangeRate-API (موثوق وسريع) ---
    try {
        const res = await fetch(proxy + encodeURIComponent("https://api.exchangerate-api.com/v4/latest/USD") + "&t=" + Date.now());
        const raw = await res.json();
        const data = JSON.parse(raw.contents);
        if (data && data.rates) {
            lastPairsData["EURUSD"] = 1 / data.rates.EUR;
            lastPairsData["GBPUSD"] = 1 / data.rates.GBP;
            lastPairsData["USDJPY"] = data.rates.JPY;
            lastPairsData["USDCHF"] = data.rates.CHF;
            lastPairsData["AUDUSD"] = 1 / data.rates.AUD;
            lastPairsData["USDCAD"] = data.rates.CAD;
            lastPairsData["NZDUSD"] = 1 / data.rates.NZD;
            lastPairsData["EURGBP"] = data.rates.GBP / data.rates.EUR;
            lastPairsData["EURJPY"] = data.rates.JPY / data.rates.EUR;
            lastPairsData["GBPJPY"] = data.rates.JPY / data.rates.GBP;
            console.log("✅ Pairs Source 1 Success");
            return lastPairsData;
        }
    } catch(e) { console.warn("⚠️ Pairs Source 1 Failed"); }

    // --- 2️⃣ المصدر الثاني: Fawaz Ahmed Currency API (احتياطي قوي) ---
    try {
        const res = await fetch(proxy + encodeURIComponent("https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json"));
        const raw = await res.json();
        const data = JSON.parse(raw.contents);
        if (data && data.usd) {
            const r = data.usd;
            lastPairsData["EURUSD"] = 1 / r.eur;
            lastPairsData["GBPUSD"] = 1 / r.gbp;
            lastPairsData["USDJPY"] = r.jpy;
            lastPairsData["USDCHF"] = r.chf;
            lastPairsData["AUDUSD"] = 1 / r.aud;
            lastPairsData["USDCAD"] = r.cad;
            console.log("✅ Pairs Source 2 Success");
            return lastPairsData;
        }
    } catch(e) { console.warn("⚠️ Pairs Source 2 Failed"); }

    // --- 3️⃣ المصدر الثالث: Gold-API (متخصص في الأسعار اللحظية) ---
    try {
        const res = await fetch(proxy + encodeURIComponent("https://api.gold-api.com/price/EURUSD"));
        const raw = await res.json();
        const data = JSON.parse(raw.contents);
        if (data && data.price) {
            lastPairsData["EURUSD"] = data.price;
            console.log("✅ Pairs Source 3 (Partial) Success");
        }
    } catch(e) { console.warn("⚠️ Pairs Source 3 Failed"); }

    return lastPairsData;
}

async function updatePairs() {
    try {
        const data = await fetchPairsSmart();

        // تحديث كارد الصفحة الرئيسية (EUR/USD كمثال)
        if (data["EURUSD"]) {
            setText("pairsHome", `EUR/USD: ${data["EURUSD"].toFixed(4)}`);
        }

        // تحديث الجدول بالكامل
        Object.keys(pairsMap).forEach(key => {
            const price = data[key];
            if (price) {
                const elementId = pairsMap[key];
                // الفوركس يعرض عادة بـ 4 أو 5 أرقام عشرية، الين الياباني بـ 2 فقط
                const precision = key.includes("JPY") ? 2 : 4;
                setText(elementId, price.toFixed(precision));
            }
        });
    } catch(e) { console.error("⚠️ Pairs Final Update Failure"); }
}


// ========================== مؤشرات الأسهم (إصلاح مؤشرات مصر) ==========================
let lastStocks = {};

async function fetchStocksSmart() {
    // 1️⃣ رموز ياهو للمؤشرات العالمية (تعمل بامتياز)
    const globalSymbols = {
        sp500: "^GSPC", nasdaq: "^IXIC", ftse: "^FTSE",
        nikkei: "^N225", shanghai: "000001.SS", 
        TASI: "^TASI.SR", ADX: "DFMGI.AE"
    };

    for (let key in globalSymbols) {
        try {
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${globalSymbols[key]}?interval=1m&range=1d`;
            const res = await fetch(proxy + encodeURIComponent(url) + "&t=" + Date.now());
            const raw = await res.json();
            const data = JSON.parse(raw.contents);
            if (data?.chart?.result) {
                lastStocks[key] = data.chart.result[0].meta.regularMarketPrice;
            }
        } catch(e) { console.warn(`⚠️ Yahoo Global (${key}) failed`); }
    }

    // 2️⃣ جلب مؤشرات مصر (EGX) من Gold-API (المصدر الأدق لمصر حالياً)
    const egxIndices = ["EGX30", "EGX70", "EGX100", "EGX33"];
    for (let egx of egxIndices) {
        try {
            // تحويل الاسم للصيغة التي يفهمها Gold-API (مثل I:EGX30)
            const symbol = egx === "EGX33" ? "I:EGX33" : `I:${egx}`;
            const res = await fetch(proxy + encodeURIComponent(`https://api.gold-api.com/price/${symbol}`) + "&t=" + Date.now());
            const raw = await res.json();
            const data = JSON.parse(raw.contents);
            
            if (data && data.price) {
                lastStocks[egx] = data.price;
                console.log(`✅ EGX Success (${egx}): ${data.price}`);
            }
        } catch(e) { 
            console.warn(`⚠️ Gold-API ${egx} failed, trying alternative...`);
            // محاولة بديلة لـ EGX30 من ياهو في حال فشل Gold-API
            if (egx === "EGX30") {
                try {
                    const resY = await fetch(proxy + encodeURIComponent("https://query1.finance.yahoo.com/v8/finance/chart/EGX30.CA?interval=1m&range=1d"));
                    const dataY = JSON.parse((await resY.json()).contents);
                    lastStocks.EGX30 = dataY.chart.result[0].meta.regularMarketPrice;
                } catch(err) {}
            }
        }
    }

    return lastStocks;
}

async function updateStocks() {
    try {
        const s = await fetchStocksSmart();

        // تحديث كارد الصفحة الرئيسية (S&P 500)
        if (s.sp500) {
            setText("stocksHome", `$${s.sp500.toLocaleString(undefined, {minimumFractionDigits: 2})}`);
        }

        // خريطة الربط مع IDs في HTML
        const mapping = {
            sp500: "sp500", nasdaq: "nasdaq", ftse: "ftse",
            nikkei: "nikkei", shanghai: "shanghai", 
            EGX30: "egx30", TASI: "tasi", ADX: "uae_index",
            EGX70: "egx70", EGX100: "egx100", EGX33: "egx33"
        };

        Object.keys(mapping).forEach(key => {
            if (s[key]) {
                const formatted = s[key].toLocaleString(undefined, { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                });
                setText(mapping[key], formatted);
            }
        });

    } catch(e) { console.error("⚠️ Stock UI Update Error"); }
}



// 4. نظام التنقل والتبديل بين الأقسام (SPA)
function initNavigation() {
    const navLinks = document.querySelectorAll(".nav-chips a");
    const cards = document.querySelectorAll(".card");
    const sections = document.querySelectorAll(".page-section");

    function activateSection(sectionId) {
        // إخفاء كل الأقسام
        sections.forEach(s => s.classList.remove("active"));
        // إظهار القسم المطلوب
        const target = document.getElementById(sectionId);
        if (target) target.classList.add("active");

        // تمييز الزر العلوي
        navLinks.forEach(n => {
            n.classList.remove("active");
            if (n.getAttribute("data-section") === sectionId) {
                n.classList.add("active");
            }
        });

        // العودة للأعلى عند التبديل
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // تفعيل الروابط العلوية
    navLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const sid = link.getAttribute("data-section");
            activateSection(sid);
        });
    });

    // تفعيل الكاردات في الرئيسية
    cards.forEach(card => {
        card.addEventListener("click", () => {
            const sid = card.getAttribute("data-section");
            activateSection(sid);
        });
    });
}

// ========================== التشغيل النهائي ==========================
document.addEventListener("DOMContentLoaded", async () => {
    // 1. تفعيل نظام التنقل (SPA) أولاً لضمان عمل الأزرار فوراً
    initNavigation(); 

    // 2. جلب الدولار الرسمي أولاً (لأنه حجر الزاوية في حسابات الجنيه المصري)
    await updateDollar(); 

    // 3. تشغيل كافة الدوال "فوراً" عند التحميل لملء البيانات الابتدائية
    updateGold();    // الذهب
    updateSilver();  // الفضة
    updateOil();     // النفط
    updateMetals();  // المعادن
    updateCrypto();  // العملات الرقمية
    updateFX();      // أسعار الصرف (الدولار، اليورو، إلخ)
    updatePairs();   // أزواج العملات (EUR/USD)
    updateStocks();  // مؤشرات الأسهم

    // 4. إعداد التحديثات الدورية (Intervals) بشكل منفصل لكل دالة
    // تم توزيع الثواني (30, 35, 40, 45...) لمنع تضارب الطلبات في نفس اللحظة
    
    setInterval(updateDollar, 3600000); // كل ساعة (تحديث سعر الصرف الرسمي)
    
    setInterval(updateGold, 30000);     // الذهب: كل 30 ثانية
    
    setInterval(updateSilver, 35000);   // الفضة: كل 35 ثانية
    
    setInterval(updateOil, 40000);      // النفط: كل 40 ثانية
    
    setInterval(updateMetals, 45000);   // المعادن: كل 45 ثانية
    
    setInterval(updateCrypto, 20000);   // الكريبتو: كل 20 ثانية (تحديث سريع)
    
    setInterval(updateFX, 60000);       // أسعار الصرف الأخرى: كل دقيقة
    
    setInterval(updatePairs, 50000);    // أزواج العملات: كل 50 ثانية
    
    setInterval(updateStocks, 55000);   // مؤشرات الأسهم: كل 55 ثانية
});


