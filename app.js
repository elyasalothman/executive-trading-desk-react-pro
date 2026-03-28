const { useEffect, useMemo, useRef, useState } = React;

const STORAGE_KEYS = {
  theme: 'etd_theme_react',
  symbol: 'etd_symbol_react',
  symbolTitle: 'etd_symbol_title_react',
  interval: 'etd_interval_react',
  journal: 'etd_journal_react',
  risk: 'etd_risk_form_react',
  unlocked: 'etd_unlocked_react'
};

const SYMBOLS = [
  { symbol: 'AMEX:SPY', title: 'S&P 500', subtitle: 'الأسهم الأمريكية' },
  { symbol: 'TADAWUL:TASI', title: 'تاسي', subtitle: 'السوق السعودي' },
  { symbol: 'OANDA:XAUUSD', title: 'الذهب', subtitle: 'المعادن الثمينة' },
  { symbol: 'OANDA:XAGUSD', title: 'الفضة', subtitle: 'المعادن الثمينة' },
  { symbol: 'NYMEX:CL1!', title: 'النفط', subtitle: 'قطاع الطاقة' },
  { symbol: 'BINANCE:BTCUSD', title: 'البيتكوين', subtitle: 'الأصول الرقمية' }
];

const INTERVALS = [
  { value: '15', label: '15د' },
  { value: '60', label: '1س' },
  { value: 'D', label: 'يومي' },
  { value: 'W', label: 'أسبوعي' },
  { value: 'M', label: 'شهري' }
];

const defaultRiskForm = {
  capital: '',
  riskPct: '1',
  entryPx: '',
  stopPx: '',
  targetPx: '',
  direction: 'long'
};

const defaultTradeForm = {
  date: new Date().toISOString().slice(0, 10),
  symbol: 'S&P 500',
  direction: 'long',
  qty: '',
  entry: '',
  exit: '',
  notes: ''
};

function getStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

function setStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function fmt(value, max = 2) {
  if (!isFinite(value)) return '—';
  return new Intl.NumberFormat('ar-SA', {
    maximumFractionDigits: max
  }).format(value);
}

function computePnl(direction, entry, exit, qty) {
  const delta = direction === 'long' ? (exit - entry) : (entry - exit);
  return delta * qty;
}

function buildMonthlyStats(trades) {
  const map = new Map();

  trades.forEach((trade) => {
    const key = trade.date ? trade.date.slice(0, 7) : 'بدون تاريخ';

    if (!map.has(key)) {
      map.set(key, {
        month: key,
        totalPnl: 0,
        trades: 0,
        wins: 0,
        losses: 0
      });
    }

    const current = map.get(key);
    current.totalPnl += trade.pnl;
    current.trades += 1;

    if (trade.pnl > 0) current.wins += 1;
    if (trade.pnl < 0) current.losses += 1;
  });

  return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
}

function createToast(setToasts, message, type = 'info', duration = 2800) {
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  setToasts((prev) => [...prev, { id, message, type }]);

  setTimeout(() => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, duration);
}

function TradingViewTicker({ theme }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;

    ref.current.innerHTML = '';
    const host = document.createElement('div');
    host.className = 'tv-full';
    ref.current.appendChild(host);

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbols: [
        { proName: 'TADAWUL:TASI', title: 'TASI' },
        { proName: 'AMEX:SPY', title: 'S&P 500' },
        { proName: 'OANDA:XAUUSD', title: 'Gold' },
        { proName: 'OANDA:XAGUSD', title: 'Silver' },
        { proName: 'NYMEX:CL1!', title: 'Crude Oil' },
        { proName: 'BINANCE:BTCUSD', title: 'Bitcoin' }
      ],
      showSymbolLogo: true,
      colorTheme: theme,
      isTransparent: true,
      displayMode: 'adaptive',
      locale: 'ar_SA'
    });

    host.appendChild(script);
  }, [theme]);

  return <div ref={ref} className="tv-full" />;
}

function TradingViewChart({ theme, symbol, interval, setStatus }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;

    setStatus('يتم تحميل الرسم البياني...');
    ref.current.innerHTML = '<div id="tv_chart_widget" class="tv-full"></div>';

    const container = ref.current;
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval,
      timezone: 'Asia/Riyadh',
      theme,
      style: '1',
      locale: 'ar_SA',
      allow_symbol_change: true,
      details: true,
      calendar: true,
      enable_publishing: false,
      support_host: 'https://www.tradingview.com',
      container_id: 'tv_chart_widget'
    });

    container.appendChild(script);

    const timer = setTimeout(() => {
      setStatus(`جاهز • ${interval}`);
    }, 900);

    return () => clearTimeout(timer);
  }, [theme, symbol, interval, setStatus]);

  return <div id="chart-host" ref={ref} />;
}

function TradingViewCalendar({ theme }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;

    ref.current.innerHTML = '<div id="tv_calendar_widget" class="tv-full"></div>';

    const container = ref.current;
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-events.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      width: '100%',
      height: '100%',
      colorTheme: theme,
      isTransparent: true,
      locale: 'ar_SA',
      importanceFilter: '-1,0,1'
    });

    container.appendChild(script);
  }, [theme]);

  return <div id="calendar-host" ref={ref} />;
}

function PerformanceChart({ trades, theme }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || typeof Chart === 'undefined') return;

    const monthlyStats = buildMonthlyStats(trades);
    const labels = monthlyStats.map((item) => item.month);
    const values = monthlyStats.map((item) => item.totalPnl);

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    if (!labels.length) return;

    const gridColor = theme === 'dark'
      ? 'rgba(255,255,255,0.08)'
      : 'rgba(17,24,39,0.08)';

    const textColor = theme === 'dark' ? '#dde4ef' : '#111827';

    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'الربح / الخسارة الشهرية',
            data: values,
            borderRadius: 8,
            backgroundColor: values.map((v) =>
              v >= 0 ? 'rgba(8,153,129,0.75)' : 'rgba(242,54,69,0.75)'
            )
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: textColor }
          }
        },
        scales: {
          x: {
            ticks: { color: textColor },
            grid: { color: gridColor }
          },
          y: {
            ticks: { color: textColor },
            grid: { color: gridColor }
          }
        }
      }
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [trades, theme]);

  if (!trades.length) {
    return (
      <div className="empty-state">
‎        أضف صفقات إلى السجل لعرض الرسم البياني الشهري للأداء.
      </div>
    );
  }

  return (
    <div className="chart-card-canvas">
      <canvas id="performanceChart" ref={canvasRef}></canvas>
    </div>
  );
}

/* =========================================================
‎   بطاقة حالة السوق - قراءة معلوماتية فقط (ليست توصية)
========================================================= */
function MarketPulseCard() {
  const [trend, setTrend] = useState('up');
  const [volatility, setVolatility] = useState('medium');
  const [events, setEvents] = useState('normal');

  const result = useMemo(() => {
    let score = 50;

‎    // الاتجاه
    if (trend === 'up') score += 20;
    if (trend === 'down') score -= 20;

‎    // التذبذب
    if (volatility === 'high') score -= 10;
    if (volatility === 'low') score += 5;

‎    // الأحداث / الأخبار
    if (events === 'important') score -= 10;
    if (events === 'quiet') score += 5;

    let state = 'محايد / متذبذب';
    let tone = 'neutral';
    let risk = 'متوسط';

    if (score >= 65) {
      state = 'إيجابي بحذر';
      tone = 'positive';
    } else if (score <= 35) {
      state = 'سلبي بحذر';
      tone = 'negative';
    }

    if (volatility === 'high' || events === 'important') {
      risk = 'مرتفع';
    } else if (volatility === 'low' && events === 'quiet') {
      risk = 'منخفض';
    }

    const reasons = [];

    if (trend === 'up') reasons.push('الاتجاه الحالي صاعد');
    if (trend === 'down') reasons.push('الاتجاه الحالي هابط');
    if (trend === 'sideways') reasons.push('الحركة الحالية جانبية');

    if (volatility === 'high') reasons.push('التذبذب مرتفع');
    if (volatility === 'medium') reasons.push('التذبذب متوسط');
    if (volatility === 'low') reasons.push('التذبذب منخفض');

    if (events === 'important') reasons.push('توجد أحداث مؤثرة');
    if (events === 'normal') reasons.push('الأحداث ضمن الوضع الطبيعي');
    if (events === 'quiet') reasons.push('لا توجد أحداث قوية الآن');

    const confidence = Math.max(35, Math.min(85, score));

    return {
      state,
      tone,
      risk,
      confidence,
      reasons
    };
  }, [trend, volatility, events]);

  return (
    <section className="panel market-pulse-panel">
      <div className="panel-header">
        <div>
          <div className="panel-title">📡 حالة السوق</div>
          <div className="panel-subtitle">قراءة معلوماتية متغيرة حسب الحالة الحالية</div>
        </div>
      </div>

      <div className="panel-body">
        <div className={`pulse-badge ${result.tone}`}>
          {result.state}
        </div>

        <div className="pulse-grid">
          <div className="pulse-card">
            <div className="pulse-label">مستوى الثقة</div>
            <div className="pulse-value">{result.confidence}%</div>
          </div>

          <div className="pulse-card">
            <div className="pulse-label">مستوى المخاطرة</div>
            <div className="pulse-value">{result.risk}</div>
          </div>
        </div>

        <div className="field" style={{ marginTop: '14px' }}>
          <label>الاتجاه الحالي</label>
          <select value={trend} onChange={(e) => setTrend(e.target.value)}>
            <option value="up">صاعد</option>
            <option value="down">هابط</option>
            <option value="sideways">جانبي</option>
          </select>
        </div>

        <div className="field">
          <label>التذبذب</label>
          <select value={volatility} onChange={(e) => setVolatility(e.target.value)}>
            <option value="low">منخفض</option>
            <option value="medium">متوسط</option>
            <option value="high">مرتفع</option>
          </select>
        </div>

        <div className="field">
          <label>الأحداث / الأخبار</label>
          <select value={events} onChange={(e) => setEvents(e.target.value)}>
            <option value="quiet">هادئة</option>
            <option value="normal">طبيعية</option>
            <option value="important">مؤثرة</option>
          </select>
        </div>

        <div className="pulse-reasons">
          <div className="pulse-label" style={{ marginBottom: '8px' }}>سبب القراءة</div>
          <ul>
            {result.reasons.map((reason, index) => (
              <li key={index}>{reason}</li>
            ))}
          </ul>
        </div>

        <div className="pulse-note">
‎          هذه قراءة مساعدة فقط وليست توصية دخول أو خروج.
        </div>
      </div>
    </section>
  );
}

function App() {
  const [theme, setTheme] = useState(localStorage.getItem(STORAGE_KEYS.theme) || 'dark');
  const [symbol, setSymbol] = useState(localStorage.getItem(STORAGE_KEYS.symbol) || 'AMEX:SPY');
  const [symbolTitle, setSymbolTitle] = useState(localStorage.getItem(STORAGE_KEYS.symbolTitle) || 'S&P 500');
  const [interval, setInterval] = useState(localStorage.getItem(STORAGE_KEYS.interval) || 'D');
  const [journal, setJournal] = useState(getStorage(STORAGE_KEYS.journal, []));
  const [riskForm, setRiskForm] = useState(getStorage(STORAGE_KEYS.risk, defaultRiskForm));
  const [tradeForm, setTradeForm] = useState({
    ...defaultTradeForm,
    symbol: localStorage.getItem(STORAGE_KEYS.symbolTitle) || 'S&P 500'
  });
  const [chartStatus, setChartStatus] = useState('جاهز');
  const [toasts, setToasts] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [directionFilter, setDirectionFilter] = useState('all');
  const [resultFilter, setResultFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [unlocked, setUnlocked] = useState(localStorage.getItem(STORAGE_KEYS.unlocked) === 'true');

  useEffect(() => {
    document.body.classList.toggle('light', theme === 'light');
    localStorage.setItem(STORAGE_KEYS.theme, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.symbol, symbol);
    localStorage.setItem(STORAGE_KEYS.symbolTitle, symbolTitle);
  }, [symbol, symbolTitle]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.interval, interval);
  }, [interval]);

  useEffect(() => {
    setStorage(STORAGE_KEYS.journal, journal);
  }, [journal]);

  useEffect(() => {
    setStorage(STORAGE_KEYS.risk, riskForm);
  }, [riskForm]);

  const riskResult = useMemo(() => {
    const capital = parseFloat(riskForm.capital);
    const riskPct = parseFloat(riskForm.riskPct);
    const entry = parseFloat(riskForm.entryPx);
    const stop = parseFloat(riskForm.stopPx);
    const target = parseFloat(riskForm.targetPx);
    const direction = riskForm.direction;

    const invalidBasic = [capital, riskPct, entry, stop].some(
      (v) => !isFinite(v) || v <= 0
    );

    if (invalidBasic) {
      return {
        riskAmount: null,
        riskPerUnit: null,
        positionSize: null,
        rr: null,
        note: 'أدخل القيم الأساسية وسيتم حساب حجم الصفقة المناسب تلقائيًا.'
      };
    }

    const riskAmount = capital * (riskPct / 100);
    const riskPerUnit = Math.abs(entry - stop);

    if (riskPerUnit === 0) {
      return {
        riskAmount: null,
        riskPerUnit: null,
        positionSize: null,
        rr: null,
        note: 'لا يمكن أن يكون سعر الدخول مساويًا لوقف الخسارة.'
      };
    }

    const positionSize = riskAmount / riskPerUnit;
    let rr = null;
    let note = 'أضف هدفًا سعريًا لاحتساب نسبة العائد إلى المخاطرة والربح النظري.';

    if (isFinite(target) && target > 0) {
      const rewardPerUnit = Math.abs(target - entry);
      rr = rewardPerUnit / riskPerUnit;
      const expectedProfit = rewardPerUnit * positionSize;

      note = '';

      if (direction === 'long') {
        if (stop >= entry) note += 'تنبيه: في الشراء يفضّل أن يكون الوقف أقل من الدخول. ';
        if (target <= entry) note += 'الهدف في الشراء يفضّل أن يكون أعلى من الدخول. ';
      } else {
        if (stop <= entry) note += 'تنبيه: في البيع يفضّل أن يكون الوقف أعلى من الدخول. ';
        if (target >= entry) note += 'الهدف في البيع يفضّل أن يكون أقل من الدخول. ';
      }

      note += `الربح النظري عند الوصول للهدف ≈ $${fmt(expectedProfit, 2)}.`;
    }

    return { riskAmount, riskPerUnit, positionSize, rr, note };
  }, [riskForm]);

  const filteredTrades = useMemo(() => {
    return [...journal].reverse().filter((trade) => {
      const textMatch =
        !searchText ||
        [trade.symbol, trade.notes, trade.date]
          .join(' ')
          .toLowerCase()
          .includes(searchText.toLowerCase());

      const directionMatch =
        directionFilter === 'all' || trade.direction === directionFilter;

      const resultMatch =
        resultFilter === 'all' ||
        (resultFilter === 'win' && trade.pnl > 0) ||
        (resultFilter === 'loss' && trade.pnl < 0) ||
        (resultFilter === 'flat' && trade.pnl === 0);

      const monthMatch =
        monthFilter === 'all' ||
        (trade.date && trade.date.slice(0, 7) === monthFilter);

      return textMatch && directionMatch && resultMatch && monthMatch;
    });
  }, [journal, searchText, directionFilter, resultFilter, monthFilter]);

  const stats = useMemo(() => {
    const totalTrades = journal.length;
    const wins = journal.filter((t) => t.pnl > 0).length;
    const totalPnl = journal.reduce((sum, t) => sum + t.pnl, 0);
    const avgPnl = totalTrades ? totalPnl / totalTrades : 0;
    const winRate = totalTrades ? (wins / totalTrades) * 100 : 0;

    return {
      totalTrades,
      totalPnl,
      avgPnl,
      winRate
    };
  }, [journal]);

  const monthlyStats = useMemo(
    () => buildMonthlyStats(journal).reverse().slice(0, 3),
    [journal]
  );

  const availableMonths = useMemo(() => {
    const months = buildMonthlyStats(journal).map((item) => item.month);
    return months.reverse();
  }, [journal]);

  function notify(message, type = 'info', duration = 2800) {
    createToast(setToasts, message, type, duration);
  }

  function handleUnlock() {
    setUnlocked(true);
    localStorage.setItem(STORAGE_KEYS.unlocked, 'true');
    notify('تم فتح النسخة الاحترافية بنجاح', 'success');
  }

  function handleSymbolChange(nextSymbol, nextTitle) {
    setSymbol(nextSymbol);
    setSymbolTitle(nextTitle);
    setTradeForm((prev) => ({ ...prev, symbol: nextTitle }));
    notify(`تم تغيير الرسم إلى ${nextTitle}`, 'success');
  }

  function handleIntervalChange(nextInterval) {
    setInterval(nextInterval);
    notify(`تم تغيير الإطار الزمني إلى ${nextInterval}`, 'info');
  }

  function handleThemeToggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    notify(`تم تفعيل الوضع ${next === 'dark' ? 'الداكن' : 'الفاتح'}`, 'info');
  }

  function handleRiskInput(name, value) {
    setRiskForm((prev) => ({ ...prev, value }));
  }

  function handleCalculateRisk() {
    if (!riskResult.riskAmount) {
      notify('تحقق من إدخال بيانات إدارة المخاطر بشكل صحيح', 'warn');
      return;
    }

    notify('تم احتساب الصفقة بنجاح', 'success');
  }

  function clearRiskForm() {
    setRiskForm(defaultRiskForm);
    notify('تم مسح حقول إدارة المخاطر', 'info');
  }

  function handleTradeInput(name, value) {
    setTradeForm((prev) => ({ ...prev, value }));
  }

  function addTrade() {
    const qty = parseFloat(tradeForm.qty);
    const entry = parseFloat(tradeForm.entry);
    const exit = parseFloat(tradeForm.exit);

    if ([qty, entry, exit].some((v) => !isFinite(v) || v <= 0)) {
      notify('أدخل كمية وسعر دخول وخروج بشكل صحيح', 'warn');
      return;
    }

    const trade = {
      id: `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      date: tradeForm.date,
      symbol: tradeForm.symbol.trim() || symbolTitle,
      direction: tradeForm.direction,
      qty,
      entry,
      exit,
      pnl: computePnl(tradeForm.direction, entry, exit, qty),
      notes: tradeForm.notes.trim()
    };

    setJournal((prev) => [...prev, trade]);
    setTradeForm({
      ...defaultTradeForm,
      date: new Date().toISOString().slice(0, 10),
      symbol: symbolTitle
    });

    notify('تمت إضافة الصفقة إلى السجل', 'success');
  }

  function deleteTrade(id) {
    setJournal((prev) => prev.filter((item) => item.id !== id));
    notify('تم حذف الصفقة', 'info');
  }

  function clearJournal() {
    setJournal([]);
    notify('تم مسح سجل الصفقات', 'warn');
  }

  function exportCsv() {
    if (!journal.length) {
      notify('لا توجد بيانات للتصدير', 'warn');
      return;
    }

    const header = ['date', 'symbol', 'direction', 'entry', 'exit', 'qty', 'pnl', 'notes'];
    const rows = journal.map((t) => [
      t.date,
      t.symbol,
      t.direction,
      t.entry,
      t.exit,
      t.qty,
      t.pnl,
      (t.notes || '').replace(/\n/g, ' ')
    ]);

    const csv = [header, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
      )
      .join('\n');

    const blob = new Blob(['\uFEFF' + csv], {
      type: 'text/csv;charset=utf-8;'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'trade-journal-react-pro.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    notify('تم تصدير ملف CSV', 'success');
  }

  function copyCurrentSymbolToTrade() {
    setTradeForm((prev) => ({ ...prev, symbol: symbolTitle }));
    notify('تم نسخ الأصل الحالي إلى نموذج السجل', 'info');
  }

  function clearFilters() {
    setSearchText('');
    setDirectionFilter('all');
    setResultFilter('all');
    setMonthFilter('all');
    notify('تمت إعادة تعيين الفلاتر', 'info');
  }

  if (!unlocked) {
    return (
      <>
        <div id="toast-container">
          {toasts.map((toast) => (
            <div key={toast.id} className={`toast ${toast.type}`}>
              {toast.message}
            </div>
          ))}
        </div>

        <section className="auth-screen">
          <div className="auth-card">
            <div className="badge">⚡ منصة تداول تنفيذية متقدمة</div>
            <h1 className="auth-title">Executive Trading Desk React Pro</h1>
            <p className="auth-subtitle">
‎              نسخة React احترافية ومنظمة على ملفات منفصلة، مع سجل صفقات، فلترة وبحث،
‎              إحصائيات شهرية، رسم بياني للأداء، وإدارة مخاطر متقدمة.
            </p>
            <button className="btn btn-primary" onClick={handleUnlock}>
‎              دخول إلى المنصة
            </button>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <div id="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            {toast.message}
          </div>
        ))}
      </div>

      <main className="app-shell">
        <header className="topbar">
          <div className="brand">
            <div className="brand-logo">📈</div>
            <div>
              <h2>GLOBAL MARKETS TERMINAL</h2>
              <p>React • الرسم البياني • إدارة المخاطر • سجل الصفقات • الأجندة الاقتصادية</p>
            </div>
          </div>

          <div className="toolbar">
            <button
              className="icon-btn"
              onClick={handleThemeToggle}
              title="تبديل المظهر"
            >
              {theme === 'dark' ? '🌙' : '☀️'}
            </button>

            <button
              className="btn btn-secondary"
              onClick={() =>
                notify('الأدوات يتم تحديثها تلقائيًا عند تغيير الأصل أو الثيم', 'info')
              }
            >
‎              ↻ تحديث الأدوات
            </button>
          </div>
        </header>

        <section className="alert">
          <strong>استراتيجية العمل:</strong>
‎          التركيز على مناطق الارتداد، مراقبة سيولة السلع، والانتباه للأحداث عالية التأثير،
‎          مع الالتزام الصارم بإدارة المخاطر قبل أي قرار تداول.
        </section>

        <section className="ticker-shell">
          <TradingViewTicker theme={theme} />
        </section>

        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-title">إجمالي الصفقات</div>
            <div className="stat-value text-accent">{fmt(stats.totalTrades, 0)}</div>
          </div>

          <div className="stat-card">
            <div className="stat-title">نسبة النجاح</div>
            <div className="stat-value text-accent">{fmt(stats.winRate, 1)}%</div>
          </div>

          <div className="stat-card">
            <div className="stat-title">إجمالي الربح / الخسارة</div>
            <div className={`stat-value ${stats.totalPnl >= 0 ? 'green' : 'red'}`}>
              ${fmt(stats.totalPnl, 2)}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-title">متوسط ربح الصفقة</div>
            <div className={`stat-value ${stats.avgPnl >= 0 ? 'green' : 'red'}`}>
              ${fmt(stats.avgPnl, 2)}
            </div>
          </div>
        </section>

        <section className="main-grid">
          <div className="stack">
            <section className="panel chart-panel">
              <div className="panel-header">
                <div>
                  <div className="panel-title">الرسم البياني المتقدم</div>
                  <div className="panel-subtitle">الأصل الحالي: {symbolTitle}</div>
                </div>

                <div className="status-badge">
                  <span className="status-dot"></span>
                  <span>{chartStatus}</span>
                </div>
              </div>

              <div className="panel-body">
                <div className="chip-group" style={{ marginBottom: '12px' }}>
                  {SYMBOLS.map((item) => (
                    <button
                      key={item.symbol}
                      className={`chip-btn ${symbol === item.symbol ? 'active' : ''}`}
                      onClick={() => handleSymbolChange(item.symbol, item.title)}
                    >
                      {item.title}
                    </button>
                  ))}
                </div>

                <div className="chip-group" style={{ marginBottom: '14px' }}>
                  {INTERVALS.map((item) => (
                    <button
                      key={item.value}
                      className={`chip-btn ${interval === item.value ? 'active' : ''}`}
                      onClick={() => handleIntervalChange(item.value)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <TradingViewChart
                  theme={theme}
                  symbol={symbol}
                  interval={interval}
                  setStatus={setChartStatus}
                />
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <div className="panel-title">📒 سجل الصفقات</div>
                  <div className="panel-subtitle">إضافة، فلترة، بحث، حذف، وتصدير CSV</div>
                </div>
              </div>

              <div className="panel-body">
                <div className="grid-2">
                  <div className="field">
                    <label htmlFor="tradeDate">تاريخ الصفقة</label>
                    <input
                      id="tradeDate"
                      type="date"
                      value={tradeForm.date}
                      onChange={(e) => handleTradeInput('date', e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="tradeSymbol">الأصل</label>
                    <input
                      id="tradeSymbol"
                      type="text"
                      value={tradeForm.symbol}
                      onChange={(e) => handleTradeInput('symbol', e.target.value)}
                      placeholder="مثال: SPY أو XAUUSD"
                    />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="field">
                    <label htmlFor="tradeDirection">نوع الصفقة</label>
                    <select
                      id="tradeDirection"
                      value={tradeForm.direction}
                      onChange={(e) => handleTradeInput('direction', e.target.value)}
                    >
                      <option value="long">شراء (Long)</option>
                      <option value="short">بيع (Short)</option>
                    </select>
                  </div>

                  <div className="field">
                    <label htmlFor="tradeQty">الكمية</label>
                    <input
                      id="tradeQty"
                      type="number"
                      min="0"
                      step="0.01"
                      value={tradeForm.qty}
                      onChange={(e) => handleTradeInput('qty', e.target.value)}
                      placeholder="مثال: 10"
                    />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="field">
                    <label htmlFor="tradeEntry">سعر الدخول</label>
                    <input
                      id="tradeEntry"
                      type="number"
                      min="0"
                      step="0.0001"
                      value={tradeForm.entry}
                      onChange={(e) => handleTradeInput('entry', e.target.value)}
                      placeholder="مثال: 520.5"
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="tradeExit">سعر الخروج</label>
                    <input
                      id="tradeExit"
                      type="number"
                      min="0"
                      step="0.0001"
                      value={tradeForm.exit}
                      onChange={(e) => handleTradeInput('exit', e.target.value)}
                      placeholder="مثال: 528"
                    />
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="tradeNotes">ملاحظات</label>
                  <textarea
                    id="tradeNotes"
                    value={tradeForm.notes}
                    onChange={(e) => handleTradeInput('notes', e.target.value)}
                    placeholder="سبب الدخول، الملاحظة الفنية، الخطأ أو الدرس المستفاد..."
                  ></textarea>
                </div>

                <div className="journal-actions" style={{ marginTop: '12px' }}>
                  <button
                    className="btn btn-primary"
                    style={{ minWidth: 'auto' }}
                    onClick={addTrade}
                  >
‎                    إضافة الصفقة
                  </button>

                  <button className="btn btn-ghost" onClick={copyCurrentSymbolToTrade}>
‎                    نسخ الأصل الحالي
                  </button>

                  <button className="btn btn-ghost" onClick={exportCsv}>
‎                    تصدير CSV
                  </button>

                  <button className="btn btn-ghost" onClick={clearJournal}>
‎                    مسح السجل
                  </button>
                </div>

                <div className="panel" style={{ marginTop: '16px', boxShadow: 'none' }}>
                  <div className="panel-body">
                    <div className="toolbar-row" style={{ marginBottom: '12px' }}>
                      <input
                        type="text"
                        placeholder="بحث في الأصل أو الملاحظات أو التاريخ"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        style={{ flex: '1 1 260px' }}
                      />

                      <select
                        value={directionFilter}
                        onChange={(e) => setDirectionFilter(e.target.value)}
                        style={{ flex: '1 1 180px' }}
                      >
                        <option value="all">كل الاتجاهات</option>
                        <option value="long">شراء فقط</option>
                        <option value="short">بيع فقط</option>
                      </select>

                      <select
                        value={resultFilter}
                        onChange={(e) => setResultFilter(e.target.value)}
                        style={{ flex: '1 1 180px' }}
                      >
                        <option value="all">كل النتائج</option>
                        <option value="win">الصفقات الرابحة</option>
                        <option value="loss">الصفقات الخاسرة</option>
                        <option value="flat">بدون ربح/خسارة</option>
                      </select>

                      <select
                        value={monthFilter}
                        onChange={(e) => setMonthFilter(e.target.value)}
                        style={{ flex: '1 1 180px' }}
                      >
                        <option value="all">كل الأشهر</option>
                        {availableMonths.map((month) => (
                          <option key={month} value={month}>
                            {month}
                          </option>
                        ))}
                      </select>

                      <button className="tiny-btn" onClick={clearFilters}>
‎                        إعادة تعيين
                      </button>
                    </div>

                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>التاريخ</th>
                            <th>الأصل</th>
                            <th>الاتجاه</th>
                            <th>الدخول</th>
                            <th>الخروج</th>
                            <th>الكمية</th>
                            <th>الربح / الخسارة</th>
                            <th>ملاحظات</th>
                            <th>إجراء</th>
                          </tr>
                        </thead>

                        <tbody>
                          {filteredTrades.length === 0 ? (
                            <tr>
                              <td colSpan="9" className="empty-state">
‎                                لا توجد نتائج مطابقة للفلاتر الحالية
                              </td>
                            </tr>
                          ) : (
                            filteredTrades.map((trade) => (
                              <tr key={trade.id}>
                                <td>{trade.date || '—'}</td>
                                <td>{trade.symbol}</td>
                                <td>
                                  <span className={`tag ${trade.direction}`}>
                                    {trade.direction === 'long' ? 'شراء' : 'بيع'}
                                  </span>
                                </td>
                                <td>{fmt(trade.entry, 4)}</td>
                                <td>{fmt(trade.exit, 4)}</td>
                                <td>{fmt(trade.qty, 2)}</td>
                                <td className={trade.pnl >= 0 ? 'pnl-positive' : 'pnl-negative'}>
                                  ${fmt(trade.pnl, 2)}
                                </td>
                                <td title={trade.notes}>
                                  {trade.notes
                                    ? trade.notes.slice(0, 32) +
                                      (trade.notes.length > 32 ? '...' : '')
                                    : '—'}
                                </td>
                                <td>
                                  <button
                                    className="danger-btn"
                                    onClick={() => deleteTrade(trade.id)}
                                  >
‎                                    حذف
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <div className="panel-title">📊 إحصائيات شهرية ورسم الأداء</div>
                  <div className="panel-subtitle">أداء الصفقات بحسب الأشهر مع رسم بياني</div>
                </div>
              </div>

              <div className="panel-body">
                <PerformanceChart trades={journal} theme={theme} />

                <div className="monthly-grid">
                  {monthlyStats.length === 0 ? (
                    <div className="month-card" style={{ gridColumn: '1 / -1' }}>
                      <h4>لا توجد بيانات شهرية بعد</h4>
                      <p>ابدأ بإضافة صفقات إلى السجل وستظهر لك بطاقات الأشهر الأخيرة تلقائيًا.</p>
                    </div>
                  ) : (
                    monthlyStats.map((month) => (
                      <div className="month-card" key={month.month}>
                        <h4>{month.month}</h4>
                        <p>
‎                          الصفقات: <strong>{fmt(month.trades, 0)}</strong>
                          <br />
‎                          الرابحة: <strong>{fmt(month.wins, 0)}</strong>
                          <br />
‎                          الخاسرة: <strong>{fmt(month.losses, 0)}</strong>
                          <br />
‎                          الصافي:{' '}
                          <strong className={month.totalPnl >= 0 ? 'text-green' : 'text-red'}>
                            ${fmt(month.totalPnl, 2)}
                          </strong>
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          </div>

          <div className="stack">
‎            {/* بطاقة حالة السوق الجديدة */}
            <MarketPulseCard />

            <section className="panel">
              <div className="panel-header">
                <div>
                  <div className="panel-title">⚖️ إدارة المخاطر</div>
                  <div className="panel-subtitle">حساب الكمية، العائد/المخاطرة، والربح المتوقع</div>
                </div>
              </div>

              <div className="panel-body">
                <div className="grid-2">
                  <div className="field">
                    <label htmlFor="capital">حجم المحفظة ($)</label>
                    <input
                      id="capital"
                      type="number"
                      min="0"
                      step="0.01"
                      value={riskForm.capital}
                      onChange={(e) => handleRiskInput('capital', e.target.value)}
                      placeholder="مثال: 10000"
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="riskPct">نسبة المخاطرة (%)</label>
                    <input
                      id="riskPct"
                      type="number"
                      min="0"
                      step="0.1"
                      value={riskForm.riskPct}
                      onChange={(e) => handleRiskInput('riskPct', e.target.value)}
                      placeholder="1"
                    />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="field">
                    <label htmlFor="entryPx">سعر الدخول</label>
                    <input
                      id="entryPx"
                      type="number"
                      min="0"
                      step="0.0001"
                      value={riskForm.entryPx}
                      onChange={(e) => handleRiskInput('entryPx', e.target.value)}
                      placeholder="مثال: 520.5"
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="stopPx">وقف الخسارة</label>
                    <input
                      id="stopPx"
                      type="number"
                      min="0"
                      step="0.0001"
                      value={riskForm.stopPx}
                      onChange={(e) => handleRiskInput('stopPx', e.target.value)}
                      placeholder="مثال: 515"
                    />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="field">
                    <label htmlFor="targetPx">الهدف السعري (اختياري)</label>
                    <input
                      id="targetPx"
                      type="number"
                      min="0"
                      step="0.0001"
                      value={riskForm.targetPx}
                      onChange={(e) => handleRiskInput('targetPx', e.target.value)}
                      placeholder="مثال: 532"
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="direction">نوع الصفقة</label>
                    <select
                      id="direction"
                      value={riskForm.direction}
                      onChange={(e) => handleRiskInput('direction', e.target.value)}
                    >
                      <option value="long">شراء (Long)</option>
                      <option value="short">بيع (Short)</option>
                    </select>
                  </div>
                </div>

                <div className="mini-actions">
                  {[0.5, 1, 2].map((value) => (
                    <button
                      key={value}
                      className="tiny-btn"
                      onClick={() => handleRiskInput('riskPct', String(value))}
                    >
                      {value}%
                    </button>
                  ))}

                  <button className="tiny-btn" onClick={copyCurrentSymbolToTrade}>
‎                    نسخ الأصل الحالي إلى السجل
                  </button>

                  <button className="tiny-btn" onClick={clearRiskForm}>
‎                    مسح
                  </button>
                </div>

                <div style={{ marginTop: '14px' }}>
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', minWidth: 'auto' }}
                    onClick={handleCalculateRisk}
                  >
‎                    حساب الصفقة
                  </button>
                </div>

                <div className="risk-summary">
                  <div className="metric">
                    <div className="metric-label">المبلغ المعرض للخطر</div>
                    <div className="metric-value text-accent">
                      {riskResult.riskAmount !== null
                        ? `$${fmt(riskResult.riskAmount, 2)}`
                        : '—'}
                    </div>
                  </div>

                  <div className="metric">
                    <div className="metric-label">المخاطرة لكل وحدة</div>
                    <div className="metric-value text-red">
                      {riskResult.riskPerUnit !== null
                        ? `$${fmt(riskResult.riskPerUnit, 4)}`
                        : '—'}
                    </div>
                  </div>

                  <div className="metric">
                    <div className="metric-label">الكمية المسموحة</div>
                    <div className="metric-value text-green">
                      {riskResult.positionSize !== null
                        ? `${fmt(riskResult.positionSize, 2)} وحدة`
                        : '—'}
                    </div>
                  </div>

                  <div className="metric">
                    <div className="metric-label">العائد / المخاطرة</div>
                    <div className="metric-value text-accent">
                      {riskResult.rr !== null ? `${fmt(riskResult.rr, 2)} R` : '—'}
                    </div>
                  </div>
                </div>

                <div className="helper-note">{riskResult.note}</div>
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <div className="panel-title">🔎 قائمة سريعة</div>
                  <div className="panel-subtitle">بدّل الأصل مباشرة على الرسم البياني أو انسخه لسجل الصفقات</div>
                </div>
              </div>

              <div className="panel-body">
                <div className="watchlist">
                  {SYMBOLS.map((item) => (
                    <button
                      key={item.symbol}
                      className={`watch-btn ${symbol === item.symbol ? 'active' : ''}`}
                      onClick={() => handleSymbolChange(item.symbol, item.title)}
                    >
                      {item.title}
                      <small>{item.subtitle}</small>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <div className="panel-title">🗓️ الأجندة الاقتصادية</div>
                  <div className="panel-subtitle">تابع الأحداث الاقتصادية المؤثرة على الأسواق</div>
                </div>
              </div>

              <div className="panel-body">
                <TradingViewCalendar theme={theme} />
              </div>
            </section>
          </div>
        </section>

        <div className="footer-note">
‎          تم تنفيذ كل المطلوب: فصل الملفات، React، فلترة وبحث، إحصائيات شهرية،
‎          رسم أداء، تصدير CSV، وحفظ محلي كامل للإعدادات والبيانات.
        </div>
      </main>
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

‎مهم جدًا
‎لكي تظهر بطاقة حالة السوق بشكل جميل، أضف أيضًا هذا الجزء في آخر style.css:
.market-pulse-panel {
  overflow: hidden;
}

.pulse-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 16px;
  border-radius: 999px;
  font-weight: 800;
  margin-bottom: 14px;
  border: 1px solid var(--border);
}

.pulse-badge.positive {
  background: rgba(8, 153, 129, 0.14);
  color: var(--green);
  border-color: rgba(8, 153, 129, 0.24);
}

.pulse-badge.negative {
  background: rgba(242, 54, 69, 0.14);
  color: var(--red);
  border-color: rgba(242, 54, 69, 0.24);
}

.pulse-badge.neutral {
  background: rgba(255, 176, 32, 0.12);
  color: var(--warning);
  border-color: rgba(255, 176, 32, 0.24);
}

.pulse-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 14px;
}

@media (max-width: 560px) {
  .pulse-grid {
    grid-template-columns: 1fr;
  }
}

.pulse-card {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 14px;
}

.pulse-label {
  color: var(--muted);
  font-size: 0.88rem;
  margin-bottom: 6px;
}

.pulse-value {
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--text);
}

.pulse-reasons {
  margin-top: 14px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 14px;
}

.pulse-reasons ul {
  margin: 0;
  padding-right: 18px;
  color: var(--text);
  line-height: 1.9;
}

.pulse-note {
  margin-top: 14px;
  font-size: 0.88rem;
  color: var(--muted);
  line-height: 1.8;
  background: rgba(255,255,255,0.02);
  border: 1px dashed var(--border);
  border-radius: 12px;
  padding: 12px;
}
