import { useState, useEffect } from 'react';
import { getSummary } from '../api/client';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  AreaChart, Area,
} from 'recharts';

const fmt = (n) => Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const fmtShort = (n) => {
  const v = Math.abs(Number(n));
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`;
  return `$${Number(n).toFixed(0)}`;
};

const formatToMonth = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
};

const ChartTooltip = ({ active, payload, label, labelFormatter }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">{labelFormatter ? labelFormatter(label) : label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="chart-tooltip-row">
          <span className="chart-tooltip-dot" style={{ background: p.color }} />
          <span>{p.name}</span>
          <span className="chart-tooltip-value">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { name, value, payload: p } = payload[0];
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-row">
        <span className="chart-tooltip-dot" style={{ background: p.color }} />
        <span>{name}</span>
        <span className="chart-tooltip-value">{fmt(value)}</span>
      </div>
    </div>
  );
};

const PERIODS = [
  { key: '1m',  label: '1M',  months: 1 },
  { key: '3m',  label: '3M',  months: 3 },
  { key: '6m',  label: '6M',  months: 6 },
  { key: '1y',  label: '1Y',  months: 12 },
  { key: 'all', label: 'All', months: null },
];

function getPeriodDates(key) {
  if (key === 'all') return {};
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - PERIODS.find(p => p.key === key).months);
  return {
    start_date: start.toISOString().slice(0, 10),
    end_date: end.toISOString().slice(0, 10),
  };
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('all');

  useEffect(() => {
    setLoading(true);
    setError(null);
    getSummary(getPeriodDates(period))
      .then(setSummary)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [period]);

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (error) return <div className="error-msg">{error}</div>;
  if (!summary) return null;

  const { totals, byCategory, monthly, dailyBalance } = summary;
  const income = Number(totals.total_income);
  const expenses = Number(totals.total_expenses);
  const balance = income - expenses;
  const savingsRate = income > 0 ? ((balance / income) * 100).toFixed(0) : 0;

  const monthMap = {};
  monthly.forEach(({ month, type, total }) => {
    if (!monthMap[month]) monthMap[month] = { month, income: 0, expense: 0 };
    monthMap[month][type] = Number(total);
  });
  const monthlyData = Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));

  let runningBalance = 0;
  const balanceData = dailyBalance.map(({ date, net }) => {
    runningBalance += Number(net);
    return { date, balance: runningBalance };
  });

  const seenMonths = new Set();
  const monthTicks = balanceData
    .filter(({ date }) => {
      const month = new Date(date).toISOString().slice(0, 7);
      if (seenMonths.has(month)) return false;
      seenMonths.add(month);
      return true;
    })
    .map(({ date }) => date);

  const expenseCategories = byCategory
    .filter((c) => c.type === 'expense')
    .map((c) => ({ name: c.name, value: Number(c.total), color: c.color }))
    .sort((a, b) => b.value - a.value);

  const totalExpenses = expenseCategories.reduce((s, c) => s + c.value, 0);

  return (
    <div>
      <div className="page-header">
        <h2>Dashboard</h2>
        <div className="period-tabs">
          {PERIODS.map(({ key, label }) => (
            <button
              key={key}
              className={`period-tab ${period === key ? 'active' : ''}`}
              onClick={() => setPeriod(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="summary-cards">
        <div className="summary-card income-card">
          <div className="card-icon-wrap income-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
            </svg>
          </div>
          <div>
            <div className="label">Total Income</div>
            <div className="value income">{fmt(income)}</div>
          </div>
        </div>
        <div className="summary-card expense-card">
          <div className="card-icon-wrap expense-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
            </svg>
          </div>
          <div>
            <div className="label">Total Expenses</div>
            <div className="value expense">{fmt(expenses)}</div>
          </div>
        </div>
        <div className="summary-card balance-card">
          <div className="card-icon-wrap balance-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <div>
            <div className="label">Net Balance</div>
            <div className={`value ${balance >= 0 ? 'income' : 'expense'}`}>{fmt(balance)}</div>
          </div>
        </div>
        <div className="summary-card savings-card">
          <div className="card-icon-wrap savings-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z"/><path d="M12 8v4l3 3"/>
            </svg>
          </div>
          <div>
            <div className="label">Savings Rate</div>
            <div className="value savings">{savingsRate}%</div>
          </div>
        </div>
      </div>

      {(expenseCategories.length > 0 || monthlyData.length > 0) && (
        <div className="charts-grid">
          {expenseCategories.length > 0 && (
            <div className="chart-card">
              <div className="chart-header">
                <h3>Spending by Category</h3>
                <span className="chart-total">{fmt(totalExpenses)}</span>
              </div>
              <div className="donut-wrap">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={expenseCategories}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={2}
                    >
                      {expenseCategories.map((entry, i) => (
                        <Cell key={i} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="pie-legend">
                {expenseCategories.slice(0, 6).map((item) => (
                  <div key={item.name} className="pie-legend-item">
                    <span className="pie-legend-dot" style={{ background: item.color }} />
                    <span className="pie-legend-name">{item.name}</span>
                    <span className="pie-legend-pct">{((item.value / totalExpenses) * 100).toFixed(0)}%</span>
                    <span className="pie-legend-val">{fmt(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {monthlyData.length > 0 && (
            <div className="chart-card">
              <div className="chart-header">
                <h3>Income vs Expenses</h3>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData} barGap={4} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={fmtShort}
                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '0.8rem', paddingTop: '0.5rem' }}
                  />
                  <Bar dataKey="income" name="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Expenses" fill="#f87171" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {balanceData.length > 0 && (
            <div className="chart-card full-width">
              <div className="chart-header">
                <h3>Balance Trend</h3>
                <span className="chart-total">{fmt(balanceData.at(-1)?.balance ?? 0)}</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={balanceData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    ticks={monthTicks}
                    tickFormatter={formatToMonth}
                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={fmtShort}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    width={52}
                  />
                  <Tooltip content={<ChartTooltip labelFormatter={formatToMonth} />} />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    name="Balance"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#balanceGradient)"
                    dot={false}
                    activeDot={{ r: 4, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {expenseCategories.length === 0 && monthlyData.length === 0 && (
        <div className="empty-state">
          <p>No transaction data yet. Add some transactions to see charts!</p>
        </div>
      )}
    </div>
  );
}
