// ===== FinDash - Personal Finance Dashboard =====
// All data persisted in localStorage

const APP = {
    STORAGE_KEY: 'findash_data',
    CURRENCY_DEFAULT: 'EUR',
    charts: {},
};

// ===== DATA MODEL =====
function defaultData() {
    return {
        lastUpdated: null,
        currency: 'EUR',

        // Bank accounts
        bankAccounts: [
            { id: 'bank1', name: 'Bank Account 1', balance: 0, currency: 'EUR', history: [] },
            { id: 'bank2', name: 'Bank Account 2', balance: 0, currency: 'EUR', history: [] },
            { id: 'bank3', name: 'Bank Account 3', balance: 0, currency: 'EUR', history: [] },
        ],

        // Assets
        assets: {
            paris: {
                value: 0,
                mortgage: 0,
                monthlyRent: 0,
                mortgagePayment: 0,
                mortgageRate: 0,
                history: [],
            },
            manarat: {
                purchasePrice: 0,
                currentValue: 0,
                amountPaid: 0,
                deliveryDate: '2026-09',
                currency: 'AED',
                history: [],
            },
            aegina: {
                propertyValue: 0,
                refurbBudget: 0,
                refurbSpent: 0,
                deliveryDate: '2027-04',
                categories: [
                    { name: 'Construction', budget: 0, spent: 0 },
                    { name: 'Electrical', budget: 0, spent: 0 },
                    { name: 'Plumbing', budget: 0, spent: 0 },
                    { name: 'Interior Design', budget: 0, spent: 0 },
                    { name: 'Landscaping', budget: 0, spent: 0 },
                    { name: 'Permits & Fees', budget: 0, spent: 0 },
                    { name: 'Other', budget: 0, spent: 0 },
                ],
                expenses: [],
                history: [],
            },
            spy: {
                shares: 0,
                costBasis: 0,
                currentPrice: 0,
                history: [],
            },
        },

        // Recurring income & expenses
        recurringIncome: [],
        recurringExpenses: [],

        // Monthly spending records: { month: 'YYYY-MM', categories: { housing: X, food: X, ... }, total: X }
        monthlySpending: [],

        // Net worth snapshots: { date: 'YYYY-MM-DD', netWorth: X, totalAssets: X, totalLiabilities: X }
        networthHistory: [],

        // Cash history snapshots
        cashHistory: [],
    };
}

// ===== STORAGE =====
function loadData() {
    try {
        const raw = localStorage.getItem(APP.STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            // Merge with defaults to handle new fields
            const base = defaultData();
            return deepMerge(base, parsed);
        }
    } catch (e) {
        console.error('Error loading data', e);
    }
    return defaultData();
}

function saveData(data) {
    data.lastUpdated = new Date().toISOString();
    localStorage.setItem(APP.STORAGE_KEY, JSON.stringify(data));
}

function deepMerge(target, source) {
    const result = { ...target };
    for (const key of Object.keys(source)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) && target[key]) {
            result[key] = deepMerge(target[key], source[key]);
        } else {
            result[key] = source[key];
        }
    }
    return result;
}

// ===== FORMAT HELPERS =====
function fmt(amount, currency) {
    currency = currency || 'EUR';
    const sym = { EUR: '\u20AC', USD: '$', GBP: '\u00A3', AED: 'AED ' };
    const prefix = sym[currency] || currency + ' ';
    if (amount === null || amount === undefined || isNaN(amount)) return '--';
    const sign = amount < 0 ? '-' : '';
    return sign + prefix + Math.abs(amount).toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtPct(val) {
    if (val === null || val === undefined || isNaN(val)) return '--';
    return val.toFixed(1) + '%';
}

function fmtDate(dateStr) {
    if (!dateStr) return '--';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function monthLabel(dateStr) {
    const d = new Date(dateStr + '-01');
    return d.toLocaleDateString('en', { month: 'short', year: '2-digit' });
}

function currentMonth() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

function addMonths(monthStr, n) {
    const [y, m] = monthStr.split('-').map(Number);
    const d = new Date(y, m - 1 + n, 1);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

// ===== CHART COLORS =====
const COLORS = [
    '#4facfe', '#667eea', '#764ba2', '#f093fb', '#f5576c',
    '#43e97b', '#38f9d7', '#fa709a', '#fee140', '#30cfd0',
    '#a18cd1', '#fbc2eb', '#ff9a9e', '#fad0c4', '#ffecd2',
];

function getColor(i) { return COLORS[i % COLORS.length]; }

// ===== MAIN APP OBJECT =====
const app = {
    data: null,

    init() {
        this.data = loadData();
        this.setupNavigation();
        this.setupUpload();
        this.renderAll();
    },

    save() {
        saveData(this.data);
        document.getElementById('last-updated-label').textContent = 'Last updated: ' + fmtDate(this.data.lastUpdated);
    },

    // ===== NAVIGATION =====
    setupNavigation() {
        document.querySelectorAll('.nav-links li').forEach(li => {
            li.addEventListener('click', () => {
                document.querySelectorAll('.nav-links li').forEach(l => l.classList.remove('active'));
                li.classList.add('active');
                const section = li.dataset.section;
                document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
                document.getElementById('section-' + section).classList.add('active');
                this.renderAll();
            });
        });
    },

    // ===== RENDER ALL =====
    renderAll() {
        this.renderDashboard();
        this.renderCashFlow();
        this.renderAssets();
        this.renderNetWorth();
        this.renderCashPositions();
        this.renderBehavior();
        this.renderAegina();
        this.renderUpdateWizard();
        if (this.data.lastUpdated) {
            document.getElementById('last-updated-label').textContent = 'Last updated: ' + fmtDate(this.data.lastUpdated);
        }
    },

    // ===== DASHBOARD =====
    renderDashboard() {
        const d = this.data;
        const nw = this.calculateNetWorth();
        const totalCash = this.getTotalCash();
        const totalAssets = nw.totalAssets;
        const monthSpend = this.getLatestMonthlySpend();

        document.getElementById('kpi-networth').textContent = fmt(nw.netWorth);
        document.getElementById('kpi-cash').textContent = fmt(totalCash);
        document.getElementById('kpi-assets').textContent = fmt(totalAssets);
        document.getElementById('kpi-spend').textContent = fmt(monthSpend);

        // Net worth change
        if (d.networthHistory.length >= 2) {
            const prev = d.networthHistory[d.networthHistory.length - 2].netWorth;
            const curr = nw.netWorth;
            const change = curr - prev;
            const pct = prev !== 0 ? (change / Math.abs(prev)) * 100 : 0;
            const el = document.getElementById('kpi-networth-change');
            el.textContent = (change >= 0 ? '+' : '') + fmt(change) + ' (' + fmtPct(pct) + ')';
            el.className = 'kpi-change ' + (change >= 0 ? 'positive' : 'negative');
        }

        // Net Worth Timeline Chart
        this.renderChart('chart-networth-timeline', 'line', () => {
            const hist = d.networthHistory;
            if (hist.length === 0) return { labels: ['No data'], datasets: [{ data: [0] }] };
            return {
                labels: hist.map(h => fmtDate(h.date)),
                datasets: [{
                    label: 'Net Worth',
                    data: hist.map(h => h.netWorth),
                    borderColor: '#4facfe',
                    backgroundColor: 'rgba(79,172,254,0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                }]
            };
        });

        // Asset Allocation Doughnut
        this.renderChart('chart-asset-allocation', 'doughnut', () => {
            const items = this.getAssetBreakdown();
            return {
                labels: items.map(i => i.name),
                datasets: [{
                    data: items.map(i => i.value),
                    backgroundColor: items.map((_, i) => getColor(i)),
                    borderWidth: 2,
                }]
            };
        }, { plugins: { legend: { position: 'right' } } });

        // Income vs Expenses Bar
        this.renderChart('chart-income-expenses', 'bar', () => {
            const months = d.monthlySpending.slice(-6);
            const income = this.getMonthlyIncome();
            return {
                labels: months.map(m => monthLabel(m.month)),
                datasets: [
                    { label: 'Income', data: months.map(() => income), backgroundColor: '#43e97b88', borderColor: '#43e97b', borderWidth: 1 },
                    { label: 'Expenses', data: months.map(m => m.total), backgroundColor: '#f5576c88', borderColor: '#f5576c', borderWidth: 1 },
                ]
            };
        });

        // Cash Trend Line
        this.renderChart('chart-cash-trend', 'line', () => {
            const hist = d.cashHistory.slice(-12);
            if (hist.length === 0) return { labels: ['No data'], datasets: [{ data: [0] }] };
            return {
                labels: hist.map(h => fmtDate(h.date)),
                datasets: [{
                    label: 'Total Cash',
                    data: hist.map(h => h.total),
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102,126,234,0.1)',
                    fill: true,
                    tension: 0.4,
                }]
            };
        });

        // Coaching Tips
        this.renderCoachingTips();
    },

    // ===== CASH FLOW =====
    renderCashFlow() {
        const d = this.data;
        const income = this.getMonthlyIncome();
        const expenses = this.getMonthlyExpenses();
        const net = income - expenses;
        const savingsRate = income > 0 ? (net / income) * 100 : 0;

        document.getElementById('cf-income').textContent = fmt(income);
        document.getElementById('cf-expenses').textContent = fmt(expenses);
        document.getElementById('cf-net').textContent = fmt(net);
        document.getElementById('cf-savings-rate').textContent = fmtPct(savingsRate);

        // Recurring lists
        this.renderRecurringList('recurring-income-list', d.recurringIncome, 'income');
        this.renderRecurringList('recurring-expense-list', d.recurringExpenses, 'expense');

        // Cash Flow Forecast
        this.renderCashFlowForecast(3);

        // Expense Breakdown
        this.renderChart('chart-expense-breakdown', 'doughnut', () => {
            const latest = d.monthlySpending[d.monthlySpending.length - 1];
            if (!latest) return { labels: ['No data'], datasets: [{ data: [1], backgroundColor: ['#eee'] }] };
            const cats = Object.entries(latest.categories).filter(([_, v]) => v > 0);
            return {
                labels: cats.map(([k]) => k.charAt(0).toUpperCase() + k.slice(1)),
                datasets: [{
                    data: cats.map(([_, v]) => v),
                    backgroundColor: cats.map((_, i) => getColor(i)),
                }]
            };
        }, { plugins: { legend: { position: 'right' } } });

        // Income Sources
        this.renderChart('chart-income-sources', 'doughnut', () => {
            const items = d.recurringIncome;
            if (items.length === 0) return { labels: ['No data'], datasets: [{ data: [1], backgroundColor: ['#eee'] }] };
            return {
                labels: items.map(i => i.name),
                datasets: [{
                    data: items.map(i => i.amount),
                    backgroundColor: items.map((_, i) => getColor(i)),
                }]
            };
        }, { plugins: { legend: { position: 'right' } } });

        // Cashflow tips
        this.renderCashFlowTips();
    },

    renderCashFlowForecast(months) {
        const d = this.data;
        const income = this.getMonthlyIncome();
        const expenses = this.getMonthlyExpenses();
        const net = income - expenses;
        const totalCash = this.getTotalCash();

        const labels = [];
        const cashProjection = [];
        const incomeData = [];
        const expenseData = [];
        let runningCash = totalCash;

        for (let i = 0; i <= months; i++) {
            const m = addMonths(currentMonth(), i);
            labels.push(monthLabel(m));
            cashProjection.push(Math.round(runningCash));
            incomeData.push(income);
            expenseData.push(expenses);
            runningCash += net;
        }

        this.renderChart('chart-cashflow-forecast', 'line', () => ({
            labels,
            datasets: [
                {
                    label: 'Projected Cash',
                    data: cashProjection,
                    borderColor: '#4facfe',
                    backgroundColor: 'rgba(79,172,254,0.1)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 3,
                },
                {
                    label: 'Monthly Income',
                    data: incomeData,
                    borderColor: '#43e97b',
                    borderDash: [5, 5],
                    pointRadius: 0,
                    tension: 0,
                },
                {
                    label: 'Monthly Expenses',
                    data: expenseData,
                    borderColor: '#f5576c',
                    borderDash: [5, 5],
                    pointRadius: 0,
                    tension: 0,
                }
            ]
        }));
    },

    setCashFlowForecast(months, btn) {
        document.querySelectorAll('.forecast-controls .btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderCashFlowForecast(months);
    },

    renderRecurringList(containerId, items, type) {
        const container = document.getElementById(containerId);
        if (items.length === 0) {
            container.innerHTML = '<p class="muted">No recurring ' + type + ' items yet.</p>';
            return;
        }
        container.innerHTML = items.map((item, i) => `
            <div class="item-row">
                <span class="item-name">${item.name}</span>
                <span class="item-amount">${fmt(item.amount, item.currency || 'EUR')}/mo</span>
                <span class="item-actions">
                    <button onclick="app.editRecurring('${type}', ${i})" title="Edit"><i class="fas fa-edit"></i></button>
                    <button onclick="app.deleteRecurring('${type}', ${i})" title="Delete"><i class="fas fa-trash"></i></button>
                </span>
            </div>
        `).join('');
    },

    // ===== ASSETS =====
    renderAssets() {
        const d = this.data;
        const a = d.assets;

        // Paris
        document.getElementById('paris-value').textContent = fmt(a.paris.value);
        document.getElementById('paris-mortgage').textContent = fmt(a.paris.mortgage);
        document.getElementById('paris-equity').textContent = fmt(a.paris.value - a.paris.mortgage);
        document.getElementById('paris-rent').textContent = fmt(a.paris.monthlyRent);
        document.getElementById('paris-mortgage-payment').textContent = fmt(a.paris.mortgagePayment);
        document.getElementById('paris-net-income').textContent = fmt(a.paris.monthlyRent - a.paris.mortgagePayment);

        // Manarat
        document.getElementById('manarat-price').textContent = fmt(a.manarat.purchasePrice, a.manarat.currency || 'AED');
        document.getElementById('manarat-value').textContent = fmt(a.manarat.currentValue, a.manarat.currency || 'AED');
        document.getElementById('manarat-paid').textContent = fmt(a.manarat.amountPaid, a.manarat.currency || 'AED');
        const manaratRemaining = a.manarat.purchasePrice - a.manarat.amountPaid;
        document.getElementById('manarat-remaining').textContent = fmt(manaratRemaining, a.manarat.currency || 'AED');
        const manaratPct = a.manarat.purchasePrice > 0 ? (a.manarat.amountPaid / a.manarat.purchasePrice) * 100 : 0;
        document.getElementById('manarat-progress').style.width = manaratPct + '%';
        document.getElementById('manarat-progress-pct').textContent = fmtPct(manaratPct);

        // Aegina
        document.getElementById('aegina-value').textContent = fmt(a.aegina.propertyValue);
        document.getElementById('aegina-budget').textContent = fmt(a.aegina.refurbBudget);
        document.getElementById('aegina-spent').textContent = fmt(a.aegina.refurbSpent);
        document.getElementById('aegina-remaining').textContent = fmt(a.aegina.refurbBudget - a.aegina.refurbSpent);

        // SPY
        document.getElementById('spy-shares').textContent = a.spy.shares || '--';
        document.getElementById('spy-cost').textContent = a.spy.costBasis ? fmt(a.spy.costBasis, 'USD') : '--';
        document.getElementById('spy-price').textContent = a.spy.currentPrice ? fmt(a.spy.currentPrice, 'USD') : '--';
        const spyValue = a.spy.shares * a.spy.currentPrice;
        document.getElementById('spy-value').textContent = fmt(spyValue, 'USD');
        const spyGain = spyValue - (a.spy.shares * a.spy.costBasis);
        const gainEl = document.getElementById('spy-gain');
        gainEl.textContent = fmt(spyGain, 'USD');
        gainEl.style.color = spyGain >= 0 ? '#2e7d32' : '#c62828';
    },

    // ===== NET WORTH =====
    renderNetWorth() {
        const nw = this.calculateNetWorth();

        document.getElementById('nw-total').textContent = fmt(nw.netWorth);
        document.getElementById('nw-assets').textContent = fmt(nw.totalAssets);
        document.getElementById('nw-liabilities').textContent = fmt(nw.totalLiabilities);

        if (this.data.networthHistory.length >= 2) {
            const prev = this.data.networthHistory[this.data.networthHistory.length - 2].netWorth;
            const change = nw.netWorth - prev;
            const el = document.getElementById('nw-change');
            el.textContent = (change >= 0 ? '+' : '') + fmt(change);
            el.className = 'kpi-change ' + (change >= 0 ? 'positive' : 'negative');
        }

        // History chart
        this.renderChart('chart-networth-history', 'line', () => {
            const hist = this.data.networthHistory;
            if (hist.length === 0) return { labels: ['No data'], datasets: [{ data: [0] }] };
            return {
                labels: hist.map(h => fmtDate(h.date)),
                datasets: [
                    { label: 'Net Worth', data: hist.map(h => h.netWorth), borderColor: '#4facfe', backgroundColor: 'rgba(79,172,254,0.1)', fill: true, tension: 0.4 },
                    { label: 'Assets', data: hist.map(h => h.totalAssets), borderColor: '#43e97b', borderDash: [4,4], tension: 0.4, pointRadius: 2 },
                    { label: 'Liabilities', data: hist.map(h => h.totalLiabilities), borderColor: '#f5576c', borderDash: [4,4], tension: 0.4, pointRadius: 2 },
                ]
            };
        });

        // Assets vs Liabilities bar
        this.renderChart('chart-assets-liabilities', 'bar', () => ({
            labels: ['Total'],
            datasets: [
                { label: 'Assets', data: [nw.totalAssets], backgroundColor: '#43e97b88', borderColor: '#43e97b', borderWidth: 1 },
                { label: 'Liabilities', data: [nw.totalLiabilities], backgroundColor: '#f5576c88', borderColor: '#f5576c', borderWidth: 1 },
            ]
        }));

        // Breakdown table
        const tbody = document.getElementById('networth-tbody');
        const items = [
            { cat: 'Real Estate', name: 'Paris Flat (Equity)', value: this.data.assets.paris.value - this.data.assets.paris.mortgage },
            { cat: 'Real Estate', name: 'Manarat Flat', value: this.data.assets.manarat.amountPaid },
            { cat: 'Real Estate', name: 'Aegina House', value: this.data.assets.aegina.propertyValue },
            { cat: 'Investments', name: 'SPY Shares', value: this.data.assets.spy.shares * this.data.assets.spy.currentPrice },
            { cat: 'Cash', name: 'Bank Accounts', value: this.getTotalCash() },
            { cat: 'Liabilities', name: 'Paris Mortgage', value: -this.data.assets.paris.mortgage },
        ];
        tbody.innerHTML = items.map(item => {
            const pct = nw.netWorth !== 0 ? (item.value / nw.netWorth) * 100 : 0;
            return `<tr>
                <td>${item.cat}</td>
                <td>${item.name}</td>
                <td style="font-weight:600;color:${item.value >= 0 ? '#1a1a2e' : '#c62828'}">${fmt(item.value)}</td>
                <td>${fmtPct(Math.abs(pct))}</td>
            </tr>`;
        }).join('');
    },

    // ===== CASH POSITIONS =====
    renderCashPositions() {
        const d = this.data;
        const total = this.getTotalCash();
        document.getElementById('cash-total').textContent = fmt(total);

        // Bank account cards
        const container = document.getElementById('bank-accounts-container');
        container.innerHTML = d.bankAccounts.map(acc => `
            <div class="bank-card">
                <h4>${acc.name}</h4>
                <div class="balance">${fmt(acc.balance, acc.currency)}</div>
                <div class="currency">${acc.currency}</div>
            </div>
        `).join('');

        // Cash distribution pie
        this.renderChart('chart-cash-distribution', 'doughnut', () => {
            const accs = d.bankAccounts.filter(a => a.balance > 0);
            if (accs.length === 0) return { labels: ['No data'], datasets: [{ data: [1], backgroundColor: ['#eee'] }] };
            return {
                labels: accs.map(a => a.name),
                datasets: [{
                    data: accs.map(a => a.balance),
                    backgroundColor: accs.map((_, i) => getColor(i)),
                }]
            };
        }, { plugins: { legend: { position: 'right' } } });

        // Cash history
        this.renderChart('chart-cash-history', 'line', () => {
            const hist = d.cashHistory.slice(-12);
            if (hist.length === 0) return { labels: ['No data'], datasets: [{ data: [0] }] };
            return {
                labels: hist.map(h => fmtDate(h.date)),
                datasets: [{
                    label: 'Total Cash',
                    data: hist.map(h => h.total),
                    borderColor: '#4facfe',
                    backgroundColor: 'rgba(79,172,254,0.15)',
                    fill: true,
                    tension: 0.4,
                }]
            };
        });
    },

    // ===== BEHAVIOR =====
    renderBehavior() {
        const d = this.data;

        // Spending trend
        this.renderChart('chart-spending-trend', 'bar', () => {
            const months = d.monthlySpending.slice(-12);
            if (months.length === 0) return { labels: ['No data'], datasets: [{ data: [0] }] };
            const avg = months.reduce((s, m) => s + m.total, 0) / months.length;
            return {
                labels: months.map(m => monthLabel(m.month)),
                datasets: [
                    { label: 'Monthly Spending', data: months.map(m => m.total), backgroundColor: months.map(m => m.total > avg * 1.15 ? '#f5576c88' : '#4facfe88'), borderColor: months.map(m => m.total > avg * 1.15 ? '#f5576c' : '#4facfe'), borderWidth: 1 },
                    { label: 'Average', data: months.map(() => Math.round(avg)), type: 'line', borderColor: '#667eea', borderDash: [5, 5], pointRadius: 0 },
                ]
            };
        });

        // Spending by category
        this.renderChart('chart-spending-category', 'radar', () => {
            const months = d.monthlySpending.slice(-3);
            if (months.length === 0) return { labels: ['No data'], datasets: [{ data: [0] }] };
            const allCats = new Set();
            months.forEach(m => Object.keys(m.categories).forEach(c => allCats.add(c)));
            const cats = [...allCats];
            return {
                labels: cats.map(c => c.charAt(0).toUpperCase() + c.slice(1)),
                datasets: months.map((m, i) => ({
                    label: monthLabel(m.month),
                    data: cats.map(c => m.categories[c] || 0),
                    borderColor: getColor(i),
                    backgroundColor: getColor(i) + '33',
                    pointRadius: 3,
                }))
            };
        }, { scales: { r: { beginAtZero: true } } });

        // Behavior alerts
        this.renderBehaviorAlerts();

        // Month comparison
        this.renderMonthComparison();
    },

    renderBehaviorAlerts() {
        const d = this.data;
        const container = document.getElementById('behavior-alerts');
        const alerts = [];

        if (d.monthlySpending.length >= 2) {
            const curr = d.monthlySpending[d.monthlySpending.length - 1];
            const prev = d.monthlySpending[d.monthlySpending.length - 2];
            const change = ((curr.total - prev.total) / prev.total) * 100;

            if (change > 15) {
                alerts.push({ type: 'warning', icon: 'fa-exclamation-triangle', text: `<strong>Spending Alert:</strong> You spent ${fmtPct(change)} more in ${monthLabel(curr.month)} (${fmt(curr.total)}) compared to ${monthLabel(prev.month)} (${fmt(prev.total)}). Review your categories to identify what changed.` });
            } else if (change > 5) {
                alerts.push({ type: 'info', icon: 'fa-info-circle', text: `<strong>Slight Increase:</strong> Spending up ${fmtPct(change)} in ${monthLabel(curr.month)}. Keep an eye on this trend.` });
            } else if (change < -10) {
                alerts.push({ type: 'success', icon: 'fa-check-circle', text: `<strong>Great job!</strong> You reduced spending by ${fmtPct(Math.abs(change))} in ${monthLabel(curr.month)}. Keep it up!` });
            }

            // Category alerts
            Object.keys(curr.categories).forEach(cat => {
                const currVal = curr.categories[cat] || 0;
                const prevVal = prev.categories[cat] || 0;
                if (prevVal > 0 && currVal > prevVal * 1.3) {
                    const catChange = ((currVal - prevVal) / prevVal) * 100;
                    alerts.push({ type: 'warning', icon: 'fa-arrow-up', text: `<strong>${cat.charAt(0).toUpperCase() + cat.slice(1)}:</strong> Up ${fmtPct(catChange)} (${fmt(currVal)} vs ${fmt(prevVal)}). Consider if this was planned.` });
                }
            });
        }

        // Savings rate coaching
        const income = this.getMonthlyIncome();
        const expenses = this.getMonthlyExpenses();
        if (income > 0) {
            const savingsRate = ((income - expenses) / income) * 100;
            if (savingsRate < 10) {
                alerts.push({ type: 'warning', icon: 'fa-piggy-bank', text: `<strong>Low Savings Rate:</strong> You're saving only ${fmtPct(savingsRate)} of income. Financial experts recommend at least 20%. Look for expenses you can reduce.` });
            } else if (savingsRate >= 30) {
                alerts.push({ type: 'success', icon: 'fa-star', text: `<strong>Excellent Savings Rate:</strong> You're saving ${fmtPct(savingsRate)} of your income. Well done!` });
            }
        }

        // Cash runway
        const totalCash = this.getTotalCash();
        if (expenses > 0 && totalCash > 0) {
            const runway = totalCash / expenses;
            if (runway < 3) {
                alerts.push({ type: 'warning', icon: 'fa-clock', text: `<strong>Cash Runway Warning:</strong> At current spending, your cash reserves would last ${runway.toFixed(1)} months. Aim for at least 6 months of emergency fund.` });
            }
        }

        if (alerts.length === 0) {
            container.innerHTML = '<p class="muted">Add monthly spending data to receive behavior alerts and coaching.</p>';
        } else {
            container.innerHTML = alerts.map(a => `
                <div class="alert-item ${a.type}">
                    <i class="fas ${a.icon}"></i>
                    <p>${a.text}</p>
                </div>
            `).join('');
        }
    },

    renderMonthComparison() {
        const d = this.data;
        const container = document.getElementById('month-comparison');
        if (d.monthlySpending.length < 2) {
            container.innerHTML = '<p class="muted">Need at least 2 months of data for comparison.</p>';
            return;
        }
        const curr = d.monthlySpending[d.monthlySpending.length - 1];
        const prev = d.monthlySpending[d.monthlySpending.length - 2];
        const allCats = new Set([...Object.keys(curr.categories), ...Object.keys(prev.categories)]);

        let html = '<table class="data-table"><thead><tr><th>Category</th><th>' + monthLabel(prev.month) + '</th><th>' + monthLabel(curr.month) + '</th><th>Change</th></tr></thead><tbody>';
        allCats.forEach(cat => {
            const pVal = prev.categories[cat] || 0;
            const cVal = curr.categories[cat] || 0;
            const diff = cVal - pVal;
            const color = diff > 0 ? '#c62828' : diff < 0 ? '#2e7d32' : '#888';
            html += `<tr><td>${cat.charAt(0).toUpperCase() + cat.slice(1)}</td><td>${fmt(pVal)}</td><td>${fmt(cVal)}</td><td style="color:${color};font-weight:600">${diff >= 0 ? '+' : ''}${fmt(diff)}</td></tr>`;
        });
        const totalDiff = curr.total - prev.total;
        const totalColor = totalDiff > 0 ? '#c62828' : totalDiff < 0 ? '#2e7d32' : '#888';
        html += `<tr style="font-weight:700;border-top:2px solid #333"><td>Total</td><td>${fmt(prev.total)}</td><td>${fmt(curr.total)}</td><td style="color:${totalColor}">${totalDiff >= 0 ? '+' : ''}${fmt(totalDiff)}</td></tr>`;
        html += '</tbody></table>';
        container.innerHTML = html;
    },

    // ===== AEGINA =====
    renderAegina() {
        const a = this.data.assets.aegina;
        document.getElementById('aegina-total-budget').textContent = fmt(a.refurbBudget);
        document.getElementById('aegina-total-spent').textContent = fmt(a.refurbSpent);
        document.getElementById('aegina-total-remaining').textContent = fmt(a.refurbBudget - a.refurbSpent);
        const pctUsed = a.refurbBudget > 0 ? (a.refurbSpent / a.refurbBudget) * 100 : 0;
        document.getElementById('aegina-pct-used').textContent = fmtPct(pctUsed);

        // Overall progress bar
        document.getElementById('aegina-overall-progress').style.width = Math.min(pctUsed, 100) + '%';
        document.getElementById('aegina-overall-pct').textContent = fmtPct(pctUsed);
        if (pctUsed > 100) {
            document.getElementById('aegina-overall-progress').style.background = 'linear-gradient(90deg, #f5576c, #c62828)';
        }

        // Timeline
        const start = new Date('2025-01-01');
        const end = new Date('2027-04-30');
        const now = new Date();
        const totalTime = end - start;
        const elapsed = Math.max(0, now - start);
        const timelinePct = Math.min((elapsed / totalTime) * 100, 100);
        document.getElementById('aegina-timeline-current').style.width = timelinePct + '%';

        // Category chart
        this.renderChart('chart-aegina-categories', 'bar', () => {
            const cats = a.categories;
            return {
                labels: cats.map(c => c.name),
                datasets: [
                    { label: 'Budget', data: cats.map(c => c.budget), backgroundColor: '#4facfe44', borderColor: '#4facfe', borderWidth: 1 },
                    { label: 'Spent', data: cats.map(c => c.spent), backgroundColor: '#f5576c88', borderColor: '#f5576c', borderWidth: 1 },
                ]
            };
        });

        // Timeline chart
        this.renderChart('chart-aegina-timeline', 'line', () => {
            if (a.expenses.length === 0) return { labels: ['No data'], datasets: [{ data: [0] }] };
            // Group expenses by month
            const byMonth = {};
            a.expenses.forEach(e => {
                const m = e.date.substring(0, 7);
                byMonth[m] = (byMonth[m] || 0) + e.amount;
            });
            const months = Object.keys(byMonth).sort();
            let cumulative = 0;
            const cumData = months.map(m => { cumulative += byMonth[m]; return cumulative; });
            return {
                labels: months.map(m => monthLabel(m)),
                datasets: [
                    { label: 'Cumulative Spend', data: cumData, borderColor: '#f5576c', backgroundColor: 'rgba(245,87,108,0.1)', fill: true, tension: 0.3 },
                    { label: 'Budget', data: months.map(() => a.refurbBudget), borderColor: '#4facfe', borderDash: [5, 5], pointRadius: 0 },
                ]
            };
        });

        // Category table
        const tbody = document.getElementById('aegina-category-tbody');
        tbody.innerHTML = a.categories.map(cat => {
            const remaining = cat.budget - cat.spent;
            const pct = cat.budget > 0 ? (cat.spent / cat.budget) * 100 : 0;
            const barColor = pct > 100 ? '#c62828' : pct > 80 ? '#f57c00' : '#4facfe';
            return `<tr>
                <td>${cat.name}</td>
                <td>${fmt(cat.budget)}</td>
                <td>${fmt(cat.spent)}</td>
                <td style="color:${remaining < 0 ? '#c62828' : '#2e7d32'}">${fmt(remaining)}</td>
                <td><div class="progress-bar" style="width:120px;height:8px;display:inline-block;vertical-align:middle"><div class="progress-fill" style="width:${Math.min(pct, 100)}%;background:${barColor}"></div></div> ${fmtPct(pct)}</td>
            </tr>`;
        }).join('');

        // Expense log
        const logContainer = document.getElementById('aegina-expense-log');
        if (a.expenses.length === 0) {
            logContainer.innerHTML = '<p class="muted">No expenses recorded yet.</p>';
        } else {
            logContainer.innerHTML = a.expenses.slice().reverse().slice(0, 20).map((e, i) => {
                const idx = a.expenses.length - 1 - i;
                return `<div class="item-row">
                    <span class="item-name">${e.description} <small style="color:#999">(${e.category})</small></span>
                    <span>${fmtDate(e.date)}</span>
                    <span class="item-amount">${fmt(e.amount)}</span>
                    <span class="item-actions"><button onclick="app.deleteAeginaExpense(${idx})" title="Delete"><i class="fas fa-trash"></i></button></span>
                </div>`;
            }).join('');
        }
    },

    // ===== UPDATE WIZARD =====
    renderUpdateWizard() {
        const container = document.getElementById('wizard-bank-inputs');
        container.innerHTML = this.data.bankAccounts.map(acc => `
            <div class="form-group">
                <label>${acc.name} (${acc.currency})</label>
                <input type="number" id="wizard-bank-${acc.id}" step="0.01" placeholder="Current balance" value="${acc.balance || ''}">
            </div>
        `).join('');
    },

    submitWizard() {
        const d = this.data;

        // Bank balances
        d.bankAccounts.forEach(acc => {
            const input = document.getElementById('wizard-bank-' + acc.id);
            if (input && input.value) {
                acc.balance = parseFloat(input.value);
                acc.history.push({ date: new Date().toISOString().split('T')[0], balance: acc.balance });
            }
        });

        // SPY
        const spyShares = document.getElementById('wizard-spy-shares');
        const spyPrice = document.getElementById('wizard-spy-price');
        if (spyShares.value) d.assets.spy.shares = parseFloat(spyShares.value);
        if (spyPrice.value) d.assets.spy.currentPrice = parseFloat(spyPrice.value);

        // Monthly spending
        const cats = ['housing', 'food', 'transport', 'utilities', 'entertainment', 'other'];
        const spending = {};
        let total = 0;
        cats.forEach(cat => {
            const input = document.getElementById('wizard-spend-' + cat);
            const val = input && input.value ? parseFloat(input.value) : 0;
            if (val > 0) {
                spending[cat] = val;
                total += val;
            }
        });

        if (total > 0) {
            const month = currentMonth();
            const existing = d.monthlySpending.findIndex(m => m.month === month);
            if (existing >= 0) {
                d.monthlySpending[existing] = { month, categories: spending, total };
            } else {
                d.monthlySpending.push({ month, categories: spending, total });
            }
            d.monthlySpending.sort((a, b) => a.month.localeCompare(b.month));
        }

        // Snapshot cash history
        const totalCash = d.bankAccounts.reduce((s, a) => s + a.balance, 0);
        d.cashHistory.push({ date: new Date().toISOString().split('T')[0], total: totalCash });

        // Snapshot net worth
        const nw = this.calculateNetWorthFromData(d);
        d.networthHistory.push({ date: new Date().toISOString().split('T')[0], ...nw });

        this.save();
        this.renderAll();
        alert('Data updated successfully!');
    },

    // ===== CALCULATIONS =====
    calculateNetWorth() {
        return this.calculateNetWorthFromData(this.data);
    },

    calculateNetWorthFromData(d) {
        const parisEquity = d.assets.paris.value - d.assets.paris.mortgage;
        const manaratValue = d.assets.manarat.amountPaid; // equity paid so far
        const aeginaValue = d.assets.aegina.propertyValue;
        const spyValue = d.assets.spy.shares * d.assets.spy.currentPrice;
        const cash = d.bankAccounts.reduce((s, a) => s + a.balance, 0);

        const totalAssets = Math.max(0, parisEquity) + manaratValue + aeginaValue + spyValue + cash + d.assets.paris.value;
        // More accurate: assets = paris value + manarat paid + aegina value + spy + cash
        // liabilities = paris mortgage
        const realAssets = d.assets.paris.value + manaratValue + aeginaValue + spyValue + cash;
        const totalLiabilities = d.assets.paris.mortgage;
        const netWorth = realAssets - totalLiabilities;

        return { netWorth, totalAssets: realAssets, totalLiabilities };
    },

    getTotalCash() {
        return this.data.bankAccounts.reduce((s, a) => s + (a.balance || 0), 0);
    },

    getMonthlyIncome() {
        return this.data.recurringIncome.reduce((s, i) => s + (i.amount || 0), 0);
    },

    getMonthlyExpenses() {
        return this.data.recurringExpenses.reduce((s, e) => s + (e.amount || 0), 0);
    },

    getLatestMonthlySpend() {
        const ms = this.data.monthlySpending;
        return ms.length > 0 ? ms[ms.length - 1].total : 0;
    },

    getAssetBreakdown() {
        const d = this.data;
        return [
            { name: 'Paris Flat', value: d.assets.paris.value },
            { name: 'Manarat Flat', value: d.assets.manarat.amountPaid },
            { name: 'Aegina House', value: d.assets.aegina.propertyValue },
            { name: 'SPY Shares', value: d.assets.spy.shares * d.assets.spy.currentPrice },
            { name: 'Cash', value: this.getTotalCash() },
        ].filter(i => i.value > 0);
    },

    // ===== COACHING TIPS =====
    renderCoachingTips() {
        const tips = [];
        const d = this.data;
        const income = this.getMonthlyIncome();
        const expenses = this.getMonthlyExpenses();

        if (!d.lastUpdated) {
            tips.push({ icon: '👋', text: '<strong>Welcome!</strong> Start by going to <strong>Update Data</strong> to enter your financial information. The more data you provide, the better insights you\'ll get.' });
        }

        if (income > 0 && expenses > 0) {
            const savingsRate = ((income - expenses) / income) * 100;
            if (savingsRate < 20) {
                tips.push({ icon: '💡', text: `Your savings rate is ${fmtPct(savingsRate)}. Try to aim for 20%+ by reducing discretionary spending.` });
            }
            if (savingsRate >= 20) {
                tips.push({ icon: '⭐', text: `Your savings rate of ${fmtPct(savingsRate)} is strong. Consider investing the surplus.` });
            }
        }

        // Manarat upcoming payment
        const manaratRemaining = d.assets.manarat.purchasePrice - d.assets.manarat.amountPaid;
        if (manaratRemaining > 0) {
            tips.push({ icon: '🏗️', text: `You have ${fmt(manaratRemaining, d.assets.manarat.currency || 'AED')} remaining on your Manarat flat. Delivery is September 2026 - make sure you plan your cash flow for the final payments.` });
        }

        // Aegina budget
        const aeginaPct = d.assets.aegina.refurbBudget > 0 ? (d.assets.aegina.refurbSpent / d.assets.aegina.refurbBudget) * 100 : 0;
        if (aeginaPct > 80) {
            tips.push({ icon: '⚠️', text: `Aegina refurbishment is at ${fmtPct(aeginaPct)} of budget. Monitor closely to avoid overruns.` });
        }

        // Cash runway
        const totalCash = this.getTotalCash();
        if (expenses > 0 && totalCash > 0) {
            const runway = totalCash / expenses;
            tips.push({ icon: '🏦', text: `Your cash runway is ${runway.toFixed(1)} months. ${runway < 6 ? 'Consider building up your emergency fund.' : 'This is a healthy buffer.'}` });
        }

        const container = document.getElementById('coaching-tips-list');
        if (tips.length === 0) {
            container.innerHTML = '<p class="muted">Update your data to receive personalized coaching tips.</p>';
        } else {
            container.innerHTML = tips.map(t => `
                <div class="tip-item">
                    <span class="tip-icon">${t.icon}</span>
                    <span class="tip-text">${t.text}</span>
                </div>
            `).join('');
        }
    },

    renderCashFlowTips() {
        const tips = [];
        const income = this.getMonthlyIncome();
        const expenses = this.getMonthlyExpenses();
        const net = income - expenses;

        if (income === 0 && expenses === 0) {
            document.getElementById('cashflow-tips-list').innerHTML = '<p class="muted">Add your income and expense data to get tips.</p>';
            return;
        }

        if (net < 0) {
            tips.push({ icon: '🚨', text: `<strong>Negative Cash Flow:</strong> You're spending ${fmt(Math.abs(net))} more than you earn monthly. This is unsustainable - review your expenses urgently.` });
        } else if (net < income * 0.1) {
            tips.push({ icon: '⚠️', text: `Your net cash flow is tight at ${fmt(net)}/month. Try to increase the gap between income and expenses.` });
        } else {
            tips.push({ icon: '✅', text: `Positive monthly cash flow of ${fmt(net)}. Consider investing the surplus for long-term growth.` });
        }

        // Paris rental yield
        const paris = this.data.assets.paris;
        if (paris.value > 0 && paris.monthlyRent > 0) {
            const annualYield = (paris.monthlyRent * 12 / paris.value) * 100;
            tips.push({ icon: '🏠', text: `Paris flat gross rental yield: ${fmtPct(annualYield)}. Net yield after mortgage: ${fmtPct(((paris.monthlyRent - paris.mortgagePayment) * 12 / paris.value) * 100)}.` });
        }

        document.getElementById('cashflow-tips-list').innerHTML = tips.map(t => `
            <div class="tip-item">
                <span class="tip-icon">${t.icon}</span>
                <span class="tip-text">${t.text}</span>
            </div>
        `).join('');
    },

    // ===== CHART HELPER =====
    renderChart(canvasId, type, dataFn, extraOpts) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        if (APP.charts[canvasId]) {
            APP.charts[canvasId].destroy();
        }

        const data = dataFn();
        const opts = {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { labels: { font: { family: 'Inter', size: 11 } } },
                datalabels: { display: false },
            },
            scales: type === 'doughnut' || type === 'pie' || type === 'radar' ? {} : {
                y: { beginAtZero: false, ticks: { font: { family: 'Inter', size: 11 } } },
                x: { ticks: { font: { family: 'Inter', size: 11 } } },
            },
            ...extraOpts,
        };

        APP.charts[canvasId] = new Chart(canvas, { type, data, options: opts });
    },

    // ===== MODALS =====
    openModal(title, bodyHtml, footerHtml) {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-body').innerHTML = bodyHtml;
        document.getElementById('modal-footer').innerHTML = footerHtml || '';
        document.getElementById('modal-overlay').classList.add('active');
    },

    closeModal() {
        document.getElementById('modal-overlay').classList.remove('active');
    },

    // Recurring income/expense modal
    openRecurringModal(type, editIndex) {
        const isEdit = editIndex !== undefined;
        const item = isEdit ? (type === 'income' ? this.data.recurringIncome[editIndex] : this.data.recurringExpenses[editIndex]) : {};
        const title = (isEdit ? 'Edit' : 'Add') + ' Recurring ' + (type === 'income' ? 'Income' : 'Expense');

        const body = `
            <div class="form-group">
                <label>Name</label>
                <input type="text" id="modal-rec-name" value="${item.name || ''}" placeholder="e.g. Salary, Rent, etc.">
            </div>
            <div class="form-group">
                <label>Amount (monthly)</label>
                <input type="number" id="modal-rec-amount" step="0.01" value="${item.amount || ''}" placeholder="0">
            </div>
            <div class="form-group">
                <label>Currency</label>
                <select id="modal-rec-currency">
                    <option value="EUR" ${(item.currency || 'EUR') === 'EUR' ? 'selected' : ''}>EUR</option>
                    <option value="USD" ${item.currency === 'USD' ? 'selected' : ''}>USD</option>
                    <option value="GBP" ${item.currency === 'GBP' ? 'selected' : ''}>GBP</option>
                    <option value="AED" ${item.currency === 'AED' ? 'selected' : ''}>AED</option>
                </select>
            </div>
        `;

        const footer = `<button class="btn btn-primary" onclick="app.saveRecurring('${type}', ${isEdit ? editIndex : -1})">Save</button>`;
        this.openModal(title, body, footer);
    },

    saveRecurring(type, editIndex) {
        const name = document.getElementById('modal-rec-name').value.trim();
        const amount = parseFloat(document.getElementById('modal-rec-amount').value);
        const currency = document.getElementById('modal-rec-currency').value;

        if (!name || isNaN(amount)) { alert('Please fill in all fields.'); return; }

        const item = { name, amount, currency };
        const list = type === 'income' ? this.data.recurringIncome : this.data.recurringExpenses;

        if (editIndex >= 0) {
            list[editIndex] = item;
        } else {
            list.push(item);
        }

        this.save();
        this.closeModal();
        this.renderAll();
    },

    editRecurring(type, index) {
        this.openRecurringModal(type, index);
    },

    deleteRecurring(type, index) {
        if (!confirm('Delete this item?')) return;
        const list = type === 'income' ? this.data.recurringIncome : this.data.recurringExpenses;
        list.splice(index, 1);
        this.save();
        this.renderAll();
    },

    // Asset Edit Modal
    openAssetEditModal(assetKey) {
        const a = this.data.assets[assetKey];
        let body = '';

        switch (assetKey) {
            case 'paris':
                body = `
                    <div class="form-group"><label>Property Value (EUR)</label><input type="number" id="modal-a-value" step="1" value="${a.value}"></div>
                    <div class="form-group"><label>Mortgage Outstanding (EUR)</label><input type="number" id="modal-a-mortgage" step="1" value="${a.mortgage}"></div>
                    <div class="form-group"><label>Monthly Rent Income (EUR)</label><input type="number" id="modal-a-rent" step="1" value="${a.monthlyRent}"></div>
                    <div class="form-group"><label>Monthly Mortgage Payment (EUR)</label><input type="number" id="modal-a-mpayment" step="1" value="${a.mortgagePayment}"></div>
                    <div class="form-group"><label>Mortgage Rate (%)</label><input type="number" id="modal-a-rate" step="0.01" value="${a.mortgageRate}"></div>
                `;
                break;
            case 'manarat':
                body = `
                    <div class="form-group"><label>Purchase Price</label><input type="number" id="modal-a-price" step="1" value="${a.purchasePrice}"></div>
                    <div class="form-group"><label>Current Value Estimate</label><input type="number" id="modal-a-curval" step="1" value="${a.currentValue}"></div>
                    <div class="form-group"><label>Amount Paid So Far</label><input type="number" id="modal-a-paid" step="1" value="${a.amountPaid}"></div>
                    <div class="form-group"><label>Currency</label>
                        <select id="modal-a-currency">
                            <option value="AED" ${a.currency === 'AED' ? 'selected' : ''}>AED</option>
                            <option value="EUR" ${a.currency === 'EUR' ? 'selected' : ''}>EUR</option>
                            <option value="USD" ${a.currency === 'USD' ? 'selected' : ''}>USD</option>
                        </select>
                    </div>
                `;
                break;
            case 'aegina':
                body = `
                    <div class="form-group"><label>Property Value (EUR)</label><input type="number" id="modal-a-propval" step="1" value="${a.propertyValue}"></div>
                    <div class="form-group"><label>Total Refurbishment Budget (EUR)</label><input type="number" id="modal-a-budget" step="1" value="${a.refurbBudget}"></div>
                `;
                break;
            case 'spy':
                body = `
                    <div class="form-group"><label>Number of Shares</label><input type="number" id="modal-a-shares" step="0.01" value="${a.shares}"></div>
                    <div class="form-group"><label>Average Cost Basis ($ per share)</label><input type="number" id="modal-a-cost" step="0.01" value="${a.costBasis}"></div>
                    <div class="form-group"><label>Current Price ($ per share)</label><input type="number" id="modal-a-price2" step="0.01" value="${a.currentPrice}"></div>
                `;
                break;
        }

        const footer = `<button class="btn btn-primary" onclick="app.saveAsset('${assetKey}')">Save</button>`;
        this.openModal('Update ' + assetKey.charAt(0).toUpperCase() + assetKey.slice(1), body, footer);
    },

    saveAsset(key) {
        const a = this.data.assets[key];
        const today = new Date().toISOString().split('T')[0];

        switch (key) {
            case 'paris':
                a.value = parseFloat(document.getElementById('modal-a-value').value) || 0;
                a.mortgage = parseFloat(document.getElementById('modal-a-mortgage').value) || 0;
                a.monthlyRent = parseFloat(document.getElementById('modal-a-rent').value) || 0;
                a.mortgagePayment = parseFloat(document.getElementById('modal-a-mpayment').value) || 0;
                a.mortgageRate = parseFloat(document.getElementById('modal-a-rate').value) || 0;
                a.history.push({ date: today, value: a.value, mortgage: a.mortgage });
                break;
            case 'manarat':
                a.purchasePrice = parseFloat(document.getElementById('modal-a-price').value) || 0;
                a.currentValue = parseFloat(document.getElementById('modal-a-curval').value) || 0;
                a.amountPaid = parseFloat(document.getElementById('modal-a-paid').value) || 0;
                a.currency = document.getElementById('modal-a-currency').value;
                a.history.push({ date: today, value: a.currentValue, paid: a.amountPaid });
                break;
            case 'aegina':
                a.propertyValue = parseFloat(document.getElementById('modal-a-propval').value) || 0;
                a.refurbBudget = parseFloat(document.getElementById('modal-a-budget').value) || 0;
                break;
            case 'spy':
                a.shares = parseFloat(document.getElementById('modal-a-shares').value) || 0;
                a.costBasis = parseFloat(document.getElementById('modal-a-cost').value) || 0;
                a.currentPrice = parseFloat(document.getElementById('modal-a-price2').value) || 0;
                a.history.push({ date: today, shares: a.shares, price: a.currentPrice });
                break;
        }

        this.save();
        this.closeModal();
        this.renderAll();
    },

    // Bank Account Modal
    openBankAccountModal() {
        let body = '<p style="margin-bottom:12px">Update your bank account names, balances, and currencies:</p>';
        this.data.bankAccounts.forEach((acc, i) => {
            body += `
                <div style="border:1px solid #eee;border-radius:8px;padding:12px;margin-bottom:12px">
                    <div class="form-group"><label>Account Name</label><input type="text" id="modal-bank-name-${i}" value="${acc.name}"></div>
                    <div class="form-row">
                        <div class="form-group"><label>Balance</label><input type="number" id="modal-bank-bal-${i}" step="0.01" value="${acc.balance}"></div>
                        <div class="form-group"><label>Currency</label>
                            <select id="modal-bank-cur-${i}">
                                <option value="EUR" ${acc.currency === 'EUR' ? 'selected' : ''}>EUR</option>
                                <option value="USD" ${acc.currency === 'USD' ? 'selected' : ''}>USD</option>
                                <option value="GBP" ${acc.currency === 'GBP' ? 'selected' : ''}>GBP</option>
                                <option value="AED" ${acc.currency === 'AED' ? 'selected' : ''}>AED</option>
                            </select>
                        </div>
                    </div>
                </div>
            `;
        });

        const footer = `<button class="btn btn-primary" onclick="app.saveBankAccounts()">Save All</button>`;
        this.openModal('Bank Accounts', body, footer);
    },

    saveBankAccounts() {
        const today = new Date().toISOString().split('T')[0];
        this.data.bankAccounts.forEach((acc, i) => {
            acc.name = document.getElementById('modal-bank-name-' + i).value.trim() || acc.name;
            acc.balance = parseFloat(document.getElementById('modal-bank-bal-' + i).value) || 0;
            acc.currency = document.getElementById('modal-bank-cur-' + i).value;
            acc.history.push({ date: today, balance: acc.balance });
        });

        // Snapshot
        const totalCash = this.data.bankAccounts.reduce((s, a) => s + a.balance, 0);
        this.data.cashHistory.push({ date: today, total: totalCash });

        this.save();
        this.closeModal();
        this.renderAll();
    },

    // Spending Modal
    openSpendingModal() {
        const month = currentMonth();
        const existing = this.data.monthlySpending.find(m => m.month === month);
        const cats = existing ? existing.categories : {};

        const body = `
            <div class="form-group"><label>Month</label><input type="month" id="modal-spend-month" value="${month}"></div>
            <div class="form-group"><label>Housing</label><input type="number" id="modal-spend-housing" step="0.01" value="${cats.housing || ''}"></div>
            <div class="form-group"><label>Food & Dining</label><input type="number" id="modal-spend-food" step="0.01" value="${cats.food || ''}"></div>
            <div class="form-group"><label>Transport</label><input type="number" id="modal-spend-transport" step="0.01" value="${cats.transport || ''}"></div>
            <div class="form-group"><label>Utilities</label><input type="number" id="modal-spend-utilities" step="0.01" value="${cats.utilities || ''}"></div>
            <div class="form-group"><label>Entertainment</label><input type="number" id="modal-spend-entertainment" step="0.01" value="${cats.entertainment || ''}"></div>
            <div class="form-group"><label>Health</label><input type="number" id="modal-spend-health" step="0.01" value="${cats.health || ''}"></div>
            <div class="form-group"><label>Shopping</label><input type="number" id="modal-spend-shopping" step="0.01" value="${cats.shopping || ''}"></div>
            <div class="form-group"><label>Other</label><input type="number" id="modal-spend-other" step="0.01" value="${cats.other || ''}"></div>
        `;

        const footer = `<button class="btn btn-primary" onclick="app.saveSpending()">Save</button>`;
        this.openModal('Monthly Spending', body, footer);
    },

    saveSpending() {
        const month = document.getElementById('modal-spend-month').value;
        const catNames = ['housing', 'food', 'transport', 'utilities', 'entertainment', 'health', 'shopping', 'other'];
        const categories = {};
        let total = 0;
        catNames.forEach(cat => {
            const val = parseFloat(document.getElementById('modal-spend-' + cat).value) || 0;
            if (val > 0) { categories[cat] = val; total += val; }
        });

        if (total === 0) { alert('Please enter at least one spending category.'); return; }

        const existing = this.data.monthlySpending.findIndex(m => m.month === month);
        if (existing >= 0) {
            this.data.monthlySpending[existing] = { month, categories, total };
        } else {
            this.data.monthlySpending.push({ month, categories, total });
        }
        this.data.monthlySpending.sort((a, b) => a.month.localeCompare(b.month));

        this.save();
        this.closeModal();
        this.renderAll();
    },

    // Aegina Expense Modal
    openAeginaExpenseModal() {
        const cats = this.data.assets.aegina.categories;
        const body = `
            <div class="form-group"><label>Date</label><input type="date" id="modal-ae-date" value="${new Date().toISOString().split('T')[0]}"></div>
            <div class="form-group"><label>Category</label>
                <select id="modal-ae-cat">
                    ${cats.map(c => `<option value="${c.name}">${c.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group"><label>Description</label><input type="text" id="modal-ae-desc" placeholder="e.g. Electrician invoice"></div>
            <div class="form-group"><label>Amount (EUR)</label><input type="number" id="modal-ae-amount" step="0.01" placeholder="0"></div>
        `;
        const footer = `<button class="btn btn-primary" onclick="app.saveAeginaExpense()">Save</button>`;
        this.openModal('Add Aegina Expense', body, footer);
    },

    saveAeginaExpense() {
        const date = document.getElementById('modal-ae-date').value;
        const category = document.getElementById('modal-ae-cat').value;
        const description = document.getElementById('modal-ae-desc').value.trim();
        const amount = parseFloat(document.getElementById('modal-ae-amount').value);

        if (!date || !description || isNaN(amount) || amount <= 0) { alert('Please fill in all fields.'); return; }

        const a = this.data.assets.aegina;
        a.expenses.push({ date, category, description, amount });
        a.refurbSpent += amount;

        // Update category spent
        const cat = a.categories.find(c => c.name === category);
        if (cat) cat.spent += amount;

        this.save();
        this.closeModal();
        this.renderAll();
    },

    deleteAeginaExpense(index) {
        if (!confirm('Delete this expense?')) return;
        const a = this.data.assets.aegina;
        const expense = a.expenses[index];
        a.refurbSpent -= expense.amount;
        const cat = a.categories.find(c => c.name === expense.category);
        if (cat) cat.spent -= expense.amount;
        a.expenses.splice(index, 1);
        this.save();
        this.renderAll();
    },

    // Aegina Category Modal
    openAeginaCategoryModal() {
        const cats = this.data.assets.aegina.categories;
        let body = '<p style="margin-bottom:12px">Set budgets for each refurbishment category:</p>';
        cats.forEach((cat, i) => {
            body += `
                <div class="form-row" style="margin-bottom:8px;align-items:end">
                    <div class="form-group"><label>${cat.name}</label><input type="number" id="modal-aegcat-${i}" step="1" value="${cat.budget}" placeholder="Budget"></div>
                </div>
            `;
        });
        body += `
            <div style="border-top:1px solid #eee;padding-top:12px;margin-top:12px">
                <div class="form-group"><label>Add New Category</label><input type="text" id="modal-aegcat-new" placeholder="Category name"></div>
            </div>
        `;
        const footer = `<button class="btn btn-primary" onclick="app.saveAeginaCategories()">Save</button>`;
        this.openModal('Aegina Refurb Categories', body, footer);
    },

    saveAeginaCategories() {
        const cats = this.data.assets.aegina.categories;
        cats.forEach((cat, i) => {
            cat.budget = parseFloat(document.getElementById('modal-aegcat-' + i).value) || 0;
        });

        // Recalculate total budget
        this.data.assets.aegina.refurbBudget = cats.reduce((s, c) => s + c.budget, 0);

        // New category
        const newName = document.getElementById('modal-aegcat-new').value.trim();
        if (newName) {
            cats.push({ name: newName, budget: 0, spent: 0 });
        }

        this.save();
        this.closeModal();
        this.renderAll();
    },

    // ===== FILE UPLOAD =====
    setupUpload() {
        const uploadArea = document.getElementById('upload-area');
        const fileInput = document.getElementById('file-upload');

        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
        uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            if (e.dataTransfer.files.length) this.processCSV(e.dataTransfer.files[0]);
        });
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) this.processCSV(e.target.files[0]);
        });
    },

    processCSV(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const lines = text.split('\n').filter(l => l.trim());
            if (lines.length < 2) { alert('CSV appears empty.'); return; }

            const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
            const rows = lines.slice(1).map(l => {
                const vals = l.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
                const row = {};
                headers.forEach((h, i) => row[h] = vals[i]);
                return row;
            });

            // Try to auto-detect columns
            const dateCol = headers.find(h => /date/i.test(h));
            const amountCol = headers.find(h => /amount|value|sum/i.test(h));
            const descCol = headers.find(h => /desc|narrat|detail|memo|ref/i.test(h));

            if (!amountCol) {
                alert('Could not find an "amount" column in your CSV. Please ensure your CSV has headers including "date", "amount", and "description".');
                return;
            }

            // Categorize transactions
            const categories = { housing: 0, food: 0, transport: 0, utilities: 0, entertainment: 0, health: 0, shopping: 0, other: 0 };
            const keywords = {
                housing: /rent|mortgage|property|housing|accommodation/i,
                food: /food|restaurant|grocery|supermarket|cafe|dining|uber\s*eat|deliveroo/i,
                transport: /transport|uber|taxi|fuel|gas|petrol|metro|bus|train|airline|flight/i,
                utilities: /electric|water|gas|internet|phone|telecom|utility|energy/i,
                entertainment: /netflix|spotify|cinema|theater|gym|sport|subscription|entertainment/i,
                health: /pharmacy|doctor|hospital|health|dental|medical/i,
                shopping: /amazon|shop|store|retail|clothing|zara|h&m/i,
            };

            let totalExpenses = 0;
            rows.forEach(row => {
                const amount = parseFloat(row[amountCol]);
                if (isNaN(amount) || amount >= 0) return; // Only expenses (negative amounts)
                const absAmount = Math.abs(amount);
                const desc = row[descCol] || '';

                let matched = false;
                for (const [cat, regex] of Object.entries(keywords)) {
                    if (regex.test(desc)) {
                        categories[cat] += absAmount;
                        matched = true;
                        break;
                    }
                }
                if (!matched) categories.other += absAmount;
                totalExpenses += absAmount;
            });

            // Show preview
            const preview = document.getElementById('upload-preview');
            preview.classList.remove('hidden');
            let html = `<h4>Statement Analysis (${rows.length} transactions)</h4>`;
            html += `<p><strong>Total Expenses Found:</strong> ${fmt(totalExpenses)}</p>`;
            html += '<table class="data-table"><thead><tr><th>Category</th><th>Amount</th></tr></thead><tbody>';
            for (const [cat, val] of Object.entries(categories)) {
                if (val > 0) {
                    html += `<tr><td>${cat.charAt(0).toUpperCase() + cat.slice(1)}</td><td>${fmt(val)}</td></tr>`;
                }
            }
            html += '</tbody></table>';
            html += `<button class="btn btn-primary" style="margin-top:12px" onclick="app.applyCSVData(${JSON.stringify(categories).replace(/"/g, '&quot;')}, ${totalExpenses})">Apply to Current Month</button>`;
            preview.innerHTML = html;
        };
        reader.readAsText(file);
    },

    applyCSVData(categories, total) {
        const month = currentMonth();
        const cleanCats = {};
        for (const [k, v] of Object.entries(categories)) {
            if (v > 0) cleanCats[k] = Math.round(v * 100) / 100;
        }

        const existing = this.data.monthlySpending.findIndex(m => m.month === month);
        if (existing >= 0) {
            this.data.monthlySpending[existing] = { month, categories: cleanCats, total: Math.round(total * 100) / 100 };
        } else {
            this.data.monthlySpending.push({ month, categories: cleanCats, total: Math.round(total * 100) / 100 });
        }
        this.data.monthlySpending.sort((a, b) => a.month.localeCompare(b.month));

        this.save();
        this.renderAll();
        alert('Spending data applied for ' + month + '!');
    },

    // ===== DATA MANAGEMENT =====
    exportData() {
        const blob = new Blob([JSON.stringify(this.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'findash-backup-' + new Date().toISOString().split('T')[0] + '.json';
        a.click();
        URL.revokeObjectURL(url);
    },

    importData(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                this.data = deepMerge(defaultData(), imported);
                this.save();
                this.renderAll();
                alert('Data imported successfully!');
            } catch (err) {
                alert('Error importing data: ' + err.message);
            }
        };
        reader.readAsText(file);
    },

    resetData() {
        if (!confirm('Are you sure you want to reset ALL data? This cannot be undone.')) return;
        if (!confirm('Really? All your financial data will be permanently deleted.')) return;
        this.data = defaultData();
        this.save();
        this.renderAll();
        alert('All data has been reset.');
    },
};

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => app.init());
