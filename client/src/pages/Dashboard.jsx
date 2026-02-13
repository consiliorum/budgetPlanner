import { useState, useEffect } from 'react';
import { getSummary } from '../api/client';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, Area, AreaChart,
} from 'recharts';

const fmt = (n) => Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getSummary()
      .then(setSummary)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (error) return <div className="error-msg">{error}</div>;
  if (!summary) return null;

  const { totals, byCategory, monthly, dailyBalance } = summary;
  const income = Number(totals.total_income);
  const expenses = Number(totals.total_expenses);
  const balance = income - expenses;

  // Build monthly chart data
  const monthMap = {};
  monthly.forEach(({ month, type, total }) => {
    if (!monthMap[month]) monthMap[month] = { month, income: 0, expense: 0 };
    monthMap[month][type] = Number(total);
  });
  const monthlyData = Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));

  // Build balance trend
  let runningBalance = 0;
  const balanceData = dailyBalance.map(({ date, net }) => {
    runningBalance += Number(net);
    return { date, balance: runningBalance };
  });

  // Expense categories for pie
  const expenseCategories = byCategory
    .filter((c) => c.type === 'expense')
    .map((c) => ({ name: c.name, value: Number(c.total), color: c.color }));

  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem' }}>Dashboard</h2>

      <div className="summary-cards">
        <div className="summary-card">
          <div className="label">Total Income</div>
          <div className="value income">{fmt(income)}</div>
        </div>
        <div className="summary-card">
          <div className="label">Total Expenses</div>
          <div className="value expense">{fmt(expenses)}</div>
        </div>
        <div className="summary-card">
          <div className="label">Balance</div>
          <div className="value balance">{fmt(balance)}</div>
        </div>
      </div>

      {(expenseCategories.length > 0 || monthlyData.length > 0) && (
        <div className="charts-grid">
          {expenseCategories.length > 0 && (
            <div className="chart-card">
              <h3>Spending by Category</h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={expenseCategories}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {expenseCategories.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => fmt(val)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {monthlyData.length > 0 && (
            <div className="chart-card">
              <h3>Monthly Income vs Expenses</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(val) => fmt(val)} />
                  <Legend />
                  <Bar dataKey="income" fill="#22c55e" name="Income" />
                  <Bar dataKey="expense" fill="#ef4444" name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {balanceData.length > 0 && (
            <div className="chart-card full-width">
              <h3>Balance Trend</h3>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={balanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(val) => fmt(val)} />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.1}
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
