import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Layers, 
  ShoppingBag, 
  CreditCard, 
  Package, 
  Users, 
  Truck, 
  RefreshCw, 
  Sun, 
  Moon, 
  ArrowUpRight, 
  BarChart3, 
  Activity, 
  CheckCircle,
  Clock,
  DollarSign
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

// Formatting Helpers
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value || 0);
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('en-IN').format(value || 0);
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'purchases' | 'inventory'>('overview');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshedMsg, setLastRefreshedMsg] = useState<string>('');
  const [globalSearch, setGlobalSearch] = useState<string>('');
  const [invWarehouse, setInvWarehouse] = useState<string>('all');
  const [invStatus, setInvStatus] = useState<string>('all');
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const toggleItemExpanded = (itemName: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemName]: !prev[itemName]
    }));
  };

  // Fetch Dashboard data
  const fetchDashboard = async (force: boolean = false) => {
    if (force) setRefreshing(true);
    else setLoading(true);
    
    try {
      const response = await fetch(`/api/dashboard?force=${force}`);
      const resData = await response.json();
      if (resData && resData.data) {
        setDashboardData(resData.data);
        const lastUpdatedDate = new Date(resData.last_updated * 1000);
        setLastRefreshedMsg(`Updated at ${lastUpdatedDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`);
      } else {
        throw new Error("Invalid response format");
      }
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError("Failed to communicate with ERPNext API. Verify server connection.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  // Sync / Refresh handler
  const handleRefresh = () => {
    fetchDashboard(true);
  };

  // Toggle theme mode
  const toggleTheme = () => {
    const nextTheme = !isDarkMode;
    setIsDarkMode(nextTheme);
    if (nextTheme) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p className="loading-text">Connecting to ERPNext Cloud API...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="loading-container" style={{ gap: '24px', maxWidth: '500px', margin: '100px auto', textAlign: 'center' }}>
        <div style={{ color: 'var(--color-danger)', fontSize: '48px' }}>⚠️</div>
        <h2 style={{ color: 'var(--text-primary)' }}>API Connection Error</h2>
        <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
        <button className="btn btn-primary" onClick={() => fetchDashboard()}>
          Retry Connection
        </button>
      </div>
    );
  }

  const kpis = dashboardData?.kpis || {};
  const salesTrends = dashboardData?.sales_trends || [];
  const purchaseTrends = dashboardData?.purchase_trends || [];
  const customerLeaderboard = dashboardData?.customer_leaderboard || [];
  const supplierLeaderboard = dashboardData?.supplier_leaderboard || [];
  const itemGroupDistribution = dashboardData?.item_group_distribution || [];
  const popularItems = dashboardData?.popular_items || [];
  const rawSalesOrders = dashboardData?.raw_sales_orders || [];
  const rawSalesInvoices = dashboardData?.raw_sales_invoices || [];
  const rawPurchaseInvoices = dashboardData?.raw_purchase_invoices || [];
  const rawItems = dashboardData?.raw_items || [];

  // Get all unique warehouses from inventory items
  const warehousesList: string[] = [];
  rawItems.forEach((item: any) => {
    if (item.warehouses) {
      item.warehouses.forEach((w: any) => {
        if (w.warehouse && !warehousesList.includes(w.warehouse)) {
          warehousesList.push(w.warehouse);
        }
      });
    }
  });

  const filteredCustomers = customerLeaderboard.filter((cust: any) => 
    cust.customer.toLowerCase().includes(globalSearch.toLowerCase())
  );

  const filteredSuppliers = supplierLeaderboard.filter((sup: any) => 
    sup.supplier.toLowerCase().includes(globalSearch.toLowerCase())
  );

  const filteredSalesOrders = rawSalesOrders.filter((order: any) => 
    order.name.toLowerCase().includes(globalSearch.toLowerCase()) ||
    order.customer.toLowerCase().includes(globalSearch.toLowerCase()) ||
    (order.status || '').toLowerCase().includes(globalSearch.toLowerCase()) ||
    (order.delivery_status || '').toLowerCase().includes(globalSearch.toLowerCase()) ||
    (order.billing_status || '').toLowerCase().includes(globalSearch.toLowerCase())
  );

  const filteredPurchaseInvoices = rawPurchaseInvoices.filter((bill: any) => 
    bill.name.toLowerCase().includes(globalSearch.toLowerCase()) ||
    bill.supplier.toLowerCase().includes(globalSearch.toLowerCase()) ||
    (bill.status || '').toLowerCase().includes(globalSearch.toLowerCase())
  );

  const filteredItems = rawItems.filter((item: any) => {
    // 1. Search filter
    const matchesSearch = 
      item.name.toLowerCase().includes(globalSearch.toLowerCase()) ||
      item.item_name.toLowerCase().includes(globalSearch.toLowerCase()) ||
      (item.item_group || '').toLowerCase().includes(globalSearch.toLowerCase());

    // 2. Warehouse filter
    const matchesWarehouse = 
      invWarehouse === 'all' || 
      (item.warehouses && item.warehouses.some((w: any) => w.warehouse === invWarehouse));

    // 3. Status filter
    const qty = item.actual_qty || 0;
    const matchesStatus = 
      invStatus === 'all' ||
      (invStatus === 'instock' && qty > 15) ||
      (invStatus === 'low' && qty > 0 && qty <= 15) ||
      (invStatus === 'outofstock' && qty <= 0);

    return matchesSearch && matchesWarehouse && matchesStatus;
  });

  // Align Sales and Purchase trends for the Overview comparison chart
  const monthsSet = new Set<string>();
  salesTrends.forEach((t: any) => monthsSet.add(t.month));
  purchaseTrends.forEach((t: any) => monthsSet.add(t.month));
  const sortedMonths = Array.from(monthsSet).sort();
  
  const comparisonData = sortedMonths.map(month => {
    const sTrend = salesTrends.find((t: any) => t.month === month);
    const pTrend = purchaseTrends.find((t: any) => t.month === month);
    return {
      month,
      Sales: sTrend ? sTrend.amount : 0,
      Purchases: pTrend ? pTrend.amount : 0
    };
  });

  // Pie chart colors
  const PIE_COLORS = [
    'var(--color-primary)', 
    'var(--color-info)', 
    'var(--color-success)', 
    'var(--color-warning)', 
    '#ec4899', 
    '#8b5cf6', 
    '#f97316'
  ];

  return (
    <div className={`app-wrapper ${isDarkMode ? 'dark' : ''}`}>
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Layers size={18} />
          </div>
          <span>ERP Insights</span>
        </div>

        <ul className="sidebar-menu">
          <li 
            className={`sidebar-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <Activity size={18} />
            Overview
          </li>
          <li 
            className={`sidebar-item ${activeTab === 'sales' ? 'active' : ''}`}
            onClick={() => setActiveTab('sales')}
          >
            <TrendingUp size={18} />
            Sales
          </li>
          <li 
            className={`sidebar-item ${activeTab === 'purchases' ? 'active' : ''}`}
            onClick={() => setActiveTab('purchases')}
          >
            <TrendingDown size={18} />
            Purchases
          </li>
          <li 
            className={`sidebar-item ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            <Package size={18} />
            Inventory
          </li>
        </ul>

        <div className="sidebar-footer">
          <div className="sidebar-profile">
            <div className="profile-avatar">AD</div>
            <div className="profile-info">
              <span className="profile-name">Administrator</span>
              <span className="profile-role">Demo Account</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="main-content">
        {/* Header Section */}
        <header className="header">
          <div className="header-left">
            <h1 className="header-title">
              {activeTab === 'overview' && 'Insights Overview'}
              {activeTab === 'sales' && 'Sales Analysis'}
              {activeTab === 'purchases' && 'Purchasing Insights'}
              {activeTab === 'inventory' && 'Inventory Diagnostics'}
            </h1>
            <div className="header-subtitle">
              <Clock size={14} />
              <span>{lastRefreshedMsg || 'Connected to ERPNext'}</span>
            </div>
          </div>

          <div className="header-right">
            {/* Global Search Bar */}
            <div className="search-bar-container" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input 
                type="text" 
                placeholder={`Search ${activeTab}...`} 
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                style={{
                  padding: '10px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  outline: 'none',
                  width: '240px',
                  transition: 'all 0.25s var(--transition-smooth)'
                }}
                onFocus={(e) => {
                  e.target.style.width = '300px';
                  e.target.style.borderColor = 'var(--color-primary)';
                }}
                onBlur={(e) => {
                  e.target.style.width = '240px';
                  e.target.style.borderColor = 'var(--border-color)';
                }}
              />
            </div>

            <button className="btn" onClick={toggleTheme} title="Toggle Light/Dark Mode">
              {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
              <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
            </button>

            <button 
              className={`btn btn-primary ${refreshing ? 'refreshing' : ''}`} 
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
              <span>{refreshing ? 'Syncing...' : 'Sync ERPNext'}</span>
            </button>
          </div>
        </header>

        {/* ================= OVERVIEW TAB ================= */}
        {activeTab === 'overview' && (
          <>
            {/* KPI Stat Cards */}
            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-card-header">
                  <span className="kpi-card-title">Total Revenue</span>
                  <div className="kpi-card-icon-wrapper" style={{ backgroundColor: 'var(--color-success-light)', color: 'var(--color-success)' }}>
                    <TrendingUp size={20} />
                  </div>
                </div>
                <div className="kpi-card-value">{formatCurrency(kpis.total_sales_invoiced)}</div>
                <div className="kpi-card-footer">
                  <span className="kpi-trend-up">{kpis.sales_invoices_count} Invoices</span>
                  <span style={{ color: 'var(--text-muted)' }}>billed to date</span>
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-card-header">
                  <span className="kpi-card-title">Outstanding Receivables</span>
                  <div className="kpi-card-icon-wrapper" style={{ backgroundColor: 'var(--color-danger-light)', color: 'var(--color-danger)' }}>
                    <CreditCard size={20} />
                  </div>
                </div>
                <div className="kpi-card-value">{formatCurrency(kpis.total_sales_outstanding)}</div>
                <div className="kpi-card-footer">
                  <span className="kpi-trend-down">
                    {formatPercent(kpis.total_sales_outstanding, kpis.total_sales_invoiced)}%
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>unpaid revenue ratio</span>
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-card-header">
                  <span className="kpi-card-title">Procurements Cost</span>
                  <div className="kpi-card-icon-wrapper" style={{ backgroundColor: 'var(--color-info-light)', color: 'var(--color-info)' }}>
                    <ShoppingBag size={20} />
                  </div>
                </div>
                <div className="kpi-card-value">{formatCurrency(kpis.total_purchases_invoiced)}</div>
                <div className="kpi-card-footer">
                  <span className="kpi-trend-neutral">{kpis.purchase_invoices_count} bills</span>
                  <span style={{ color: 'var(--text-muted)' }}>from suppliers</span>
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-card-header">
                  <span className="kpi-card-title">Accounts Payable</span>
                  <div className="kpi-card-icon-wrapper" style={{ backgroundColor: 'var(--color-warning-light)', color: 'var(--color-warning)' }}>
                    <Truck size={20} />
                  </div>
                </div>
                <div className="kpi-card-value">{formatCurrency(kpis.total_purchases_outstanding)}</div>
                <div className="kpi-card-footer">
                  <span className="kpi-trend-down">
                    {formatPercent(kpis.total_purchases_outstanding, kpis.total_purchases_invoiced)}%
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>outstanding cash outflow</span>
                </div>
              </div>
            </div>

            {/* Main Comparison Chart */}
            <div className="chart-card" style={{ marginBottom: '32px' }}>
              <div className="chart-card-header">
                <div>
                  <h3 className="chart-card-title">Income vs. Expense Flow</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Comparison of invoicing activity between sales and procurements</p>
                </div>
              </div>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={comparisonData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-info)" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="var(--color-info)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="month" stroke="var(--text-secondary)" fontSize={12} />
                    <YAxis stroke="var(--text-secondary)" fontSize={12} tickFormatter={(v) => `₹${v/1000}k`} />
                    <Tooltip 
                      formatter={(value: any) => [formatCurrency(value as number), '']} 
                      contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="Sales" stroke="var(--color-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" name="Sales Revenue" />
                    <Area type="monotone" dataKey="Purchases" stroke="var(--color-info)" strokeWidth={3} fillOpacity={1} fill="url(#colorPurchases)" name="Purchases Cost" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Leaderboards Segment */}
            <div className="data-section-grid">
              <div className="section-card">
                <div className="section-card-header">
                  <h3 className="section-card-title">Top Revenue Customers</h3>
                  <Users size={16} style={{ color: 'var(--text-secondary)' }} />
                </div>
                <div className="leaderboard-list">
                  {filteredCustomers.slice(0, 5).map((cust: any, index: number) => (
                    <div key={cust.customer} className="leaderboard-item">
                      <div className="leaderboard-info">
                        <span className={`leaderboard-rank rank-${index + 1}`}>{index + 1}</span>
                        <span className="leaderboard-name">{cust.customer}</span>
                      </div>
                      <span className="leaderboard-value">{formatCurrency(cust.amount)}</span>
                    </div>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '16px' }}>No customer accounts registered or matched</p>
                  )}
                </div>
              </div>

              <div className="section-card">
                <div className="section-card-header">
                  <h3 className="section-card-title">Key Suppliers</h3>
                  <Truck size={16} style={{ color: 'var(--text-secondary)' }} />
                </div>
                <div className="leaderboard-list">
                  {filteredSuppliers.slice(0, 5).map((sup: any, index: number) => (
                    <div key={sup.supplier} className="leaderboard-item">
                      <div className="leaderboard-info">
                        <span className={`leaderboard-rank rank-${index + 1}`}>{index + 1}</span>
                        <span className="leaderboard-name">{sup.supplier}</span>
                      </div>
                      <span className="leaderboard-value">{formatCurrency(sup.amount)}</span>
                    </div>
                  ))}
                  {filteredSuppliers.length === 0 && (
                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '16px' }}>No supplier records registered or matched</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ================= SALES TAB ================= */}
        {activeTab === 'sales' && (
          <>
            {/* KPI indicators */}
            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-card-header">
                  <span className="kpi-card-title">Sales Orders</span>
                  <div className="kpi-card-icon-wrapper" style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                    <ShoppingBag size={20} />
                  </div>
                </div>
                <div className="kpi-card-value">{kpis.sales_orders_count}</div>
                <div className="kpi-card-footer">
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Active Sales Pipeline</span>
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-card-header">
                  <span className="kpi-card-title">Invoiced Revenue</span>
                  <div className="kpi-card-icon-wrapper" style={{ backgroundColor: 'var(--color-success-light)', color: 'var(--color-success)' }}>
                    <CheckCircle size={20} />
                  </div>
                </div>
                <div className="kpi-card-value">{formatCurrency(kpis.total_sales_invoiced)}</div>
                <div className="kpi-card-footer">
                  <span className="kpi-trend-up">{formatCurrency(kpis.total_paid_sales)} Paid</span>
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-card-header">
                  <span className="kpi-card-title">Total Customers</span>
                  <div className="kpi-card-icon-wrapper" style={{ backgroundColor: 'var(--color-info-light)', color: 'var(--color-info)' }}>
                    <Users size={20} />
                  </div>
                </div>
                <div className="kpi-card-value">{kpis.customers_count}</div>
                <div className="kpi-card-footer">
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Active Clients registered</span>
                </div>
              </div>
            </div>

            {/* Sales Chart */}
            <div className="chart-card" style={{ marginBottom: '32px' }}>
              <div className="chart-card-header">
                <h3 className="chart-card-title">Revenue Generation by Month</h3>
              </div>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesTrends} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="month" stroke="var(--text-secondary)" fontSize={12} />
                    <YAxis stroke="var(--text-secondary)" fontSize={12} tickFormatter={(v) => `₹${v/1000}k`} />
                    <Tooltip 
                      formatter={(value: any) => [formatCurrency(value as number), 'Revenue']} 
                      contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
                    />
                    <Bar dataKey="amount" fill="var(--color-primary)" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Orders table */}
            <div className="section-card" style={{ marginBottom: '32px' }}>
              <div className="section-card-header">
                <h3 className="section-card-title">Recent Sales Pipeline</h3>
              </div>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Customer</th>
                      <th>Date</th>
                      <th>Grand Total</th>
                      <th>Delivery Status</th>
                      <th>Billing Status</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSalesOrders.map((order: any) => (
                      <tr key={order.name}>
                        <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{order.name}</td>
                        <td>{order.customer}</td>
                        <td>{formatDate(order.transaction_date)}</td>
                        <td style={{ fontWeight: 700 }}>{formatCurrency(order.grand_total)}</td>
                        <td>
                          <span className={`badge ${order.delivery_status === 'Fully Delivered' ? 'badge-success' : 'badge-warning'}`}>
                            {order.delivery_status}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${order.billing_status === 'Fully Billed' ? 'badge-success' : 'badge-warning'}`}>
                            {order.billing_status}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${order.status === 'Completed' ? 'badge-success' : 'badge-info'}`}>
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filteredSalesOrders.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                          No Sales Orders matched the search query.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ================= PURCHASES TAB ================= */}
        {activeTab === 'purchases' && (
          <>
            {/* KPI stats */}
            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-card-header">
                  <span className="kpi-card-title">Purchase Orders</span>
                  <div className="kpi-card-icon-wrapper" style={{ backgroundColor: 'var(--color-info-light)', color: 'var(--color-info)' }}>
                    <ShoppingBag size={20} />
                  </div>
                </div>
                <div className="kpi-card-value">{kpis.purchase_orders_count}</div>
                <div className="kpi-card-footer">
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Active purchase pipeline</span>
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-card-header">
                  <span className="kpi-card-title">Total Invoiced Costs</span>
                  <div className="kpi-card-icon-wrapper" style={{ backgroundColor: 'var(--color-danger-light)', color: 'var(--color-danger)' }}>
                    <TrendingDown size={20} />
                  </div>
                </div>
                <div className="kpi-card-value">{formatCurrency(kpis.total_purchases_invoiced)}</div>
                <div className="kpi-card-footer">
                  <span className="kpi-trend-up">{formatCurrency(kpis.total_paid_purchases)} Paid</span>
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-card-header">
                  <span className="kpi-card-title">Total Suppliers</span>
                  <div className="kpi-card-icon-wrapper" style={{ backgroundColor: 'var(--color-warning-light)', color: 'var(--color-warning)' }}>
                    <Truck size={20} />
                  </div>
                </div>
                <div className="kpi-card-value">{kpis.suppliers_count}</div>
                <div className="kpi-card-footer">
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Registered logistics contacts</span>
                </div>
              </div>
            </div>

            {/* Purchases Chart */}
            <div className="chart-card" style={{ marginBottom: '32px' }}>
              <div className="chart-card-header">
                <h3 className="chart-card-title">Purchasing Overhead by Month</h3>
              </div>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={purchaseTrends} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="month" stroke="var(--text-secondary)" fontSize={12} />
                    <YAxis stroke="var(--text-secondary)" fontSize={12} tickFormatter={(v) => `₹${v/1000}k`} />
                    <Tooltip 
                      formatter={(value: any) => [formatCurrency(value as number), 'Cost']} 
                      contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
                    />
                    <Bar dataKey="amount" fill="var(--color-info)" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Purchase Bills */}
            <div className="section-card" style={{ marginBottom: '32px' }}>
              <div className="section-card-header">
                <h3 className="section-card-title">Outstanding Purchase Invoices</h3>
              </div>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Bill Code</th>
                      <th>Supplier</th>
                      <th>Posting Date</th>
                      <th>Total Value</th>
                      <th>Amount Outstanding</th>
                      <th>Payment Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPurchaseInvoices.map((bill: any) => (
                      <tr key={bill.name}>
                        <td style={{ fontWeight: 600, color: 'var(--color-info)' }}>{bill.name}</td>
                        <td>{bill.supplier}</td>
                        <td>{formatDate(bill.posting_date)}</td>
                        <td style={{ fontWeight: 700 }}>{formatCurrency(bill.grand_total)}</td>
                        <td style={{ color: bill.outstanding_amount > 0 ? 'var(--color-danger)' : 'var(--text-primary)' }}>
                          {formatCurrency(bill.outstanding_amount)}
                        </td>
                        <td>
                          <span className={`badge ${
                            bill.status === 'Paid' ? 'badge-success' : 
                            bill.status === 'Overdue' ? 'badge-danger' : 'badge-warning'
                          }`}>
                            {bill.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filteredPurchaseInvoices.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                          No Purchase Invoices matched the search query.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ================= INVENTORY TAB ================= */}
        {activeTab === 'inventory' && (
          <>
            {/* KPI grid */}
            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-card-header">
                  <span className="kpi-card-title">Unique Catalog Items</span>
                  <div className="kpi-card-icon-wrapper" style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                    <Package size={20} />
                  </div>
                </div>
                <div className="kpi-card-value">{formatNumber(kpis.items_count)}</div>
                <div className="kpi-card-footer">
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {formatNumber(itemGroupDistribution.length)} Product Groups
                  </span>
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-card-header">
                  <span className="kpi-card-title">Total Stock Quantity</span>
                  <div className="kpi-card-icon-wrapper" style={{ backgroundColor: 'var(--color-info-light)', color: 'var(--color-info)' }}>
                    <Layers size={20} />
                  </div>
                </div>
                <div className="kpi-card-value">{formatNumber(kpis.total_stock_qty)}</div>
                <div className="kpi-card-footer">
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Items on hand</span>
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-card-header">
                  <span className="kpi-card-title">Stock Valuation</span>
                  <div className="kpi-card-icon-wrapper" style={{ backgroundColor: 'var(--color-success-light)', color: 'var(--color-success)' }}>
                    <DollarSign size={20} />
                  </div>
                </div>
                <div className="kpi-card-value">{formatCurrency(kpis.total_stock_value)}</div>
                <div className="kpi-card-footer">
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Asset book value</span>
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-card-header">
                  <span className="kpi-card-title">Stock Alerts</span>
                  <div className="kpi-card-icon-wrapper" style={{ 
                    backgroundColor: ((kpis.out_of_stock_count || 0) + (kpis.low_stock_count || 0)) > 0 ? 'var(--color-danger-light)' : 'var(--color-success-light)', 
                    color: ((kpis.out_of_stock_count || 0) + (kpis.low_stock_count || 0)) > 0 ? 'var(--color-danger)' : 'var(--color-success)' 
                  }}>
                    <Activity size={20} />
                  </div>
                </div>
                <div className="kpi-card-value">{formatNumber((kpis.out_of_stock_count || 0) + (kpis.low_stock_count || 0))}</div>
                <div className="kpi-card-footer">
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {kpis.out_of_stock_count || 0} Out | {kpis.low_stock_count || 0} Low Stock
                  </span>
                </div>
              </div>
            </div>

            {/* Inventory Charts Grid */}
            <div className="charts-grid" style={{ marginBottom: '32px' }}>
              <div className="chart-card">
                <div className="chart-card-header">
                  <h3 className="chart-card-title">Item Group Distribution</h3>
                </div>
                <div className="chart-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={itemGroupDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="count"
                        nameKey="group"
                        label={({ group, percent }) => `${group} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {itemGroupDistribution.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Warehouse Valuation Breakdown */}
              <div className="chart-card">
                <div className="chart-card-header">
                  <h3 className="chart-card-title">Warehouse Stock Valuation</h3>
                </div>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={dashboardData?.warehouse_valuation || []}
                      layout="vertical"
                      margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                      <XAxis type="number" stroke="var(--text-secondary)" fontSize={12} tickFormatter={(v) => `₹${v/1000}k`} />
                      <YAxis dataKey="warehouse" type="category" stroke="var(--text-secondary)" fontSize={11} width={150} />
                      <Tooltip 
                        formatter={(value: any) => [formatCurrency(value as number), 'Stock Value']}
                        contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
                      />
                      <Bar dataKey="value" fill="var(--color-info)" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="charts-grid" style={{ marginBottom: '32px' }}>
              {/* Popular item trends */}
              <div className="section-card">
                <div className="section-card-header">
                  <h3 className="section-card-title">Top Product Sellers (by Revenue)</h3>
                </div>
                <div className="leaderboard-list">
                  {popularItems.slice(0, 5).map((pop: any, index: number) => (
                    <div key={pop.item_code} className="leaderboard-item">
                      <div>
                        <span className="leaderboard-name" style={{ display: 'block' }}>{pop.item_name}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>SKU: {pop.item_code} | Qty Sold: {pop.qty}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span className="leaderboard-value" style={{ display: 'block' }}>{formatCurrency(pop.amount)}</span>
                        <span style={{ fontSize: '11px', color: 'var(--color-success)', fontWeight: 'bold' }}>
                          Margin: +{formatCurrency(pop.gross_profit)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {popularItems.length === 0 && (
                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px 0' }}>
                      No recent sales order details parsed. Run sync or check Sales pipeline.
                    </p>
                  )}
                </div>
              </div>

              {/* Stock Health Alerts & Reorders */}
              <div className="section-card">
                <div className="section-card-header">
                  <h3 className="section-card-title">Stock Health & Reorders</h3>
                  <span className="badge badge-danger" style={{ fontSize: '10px' }}>Urgent Attention</span>
                </div>
                <div className="leaderboard-list" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                  {(() => {
                    const alertItems = rawItems
                      .filter((item: any) => (item.actual_qty || 0) <= 15)
                      .sort((a: any, b: any) => (a.actual_qty || 0) - (b.actual_qty || 0));

                    if (alertItems.length === 0) {
                      return (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
                          <CheckCircle size={32} style={{ color: 'var(--color-success)', marginBottom: '8px' }} />
                          <p style={{ fontWeight: 600 }}>All stock levels healthy!</p>
                        </div>
                      );
                    }

                    return alertItems.map((item: any) => {
                      const isOutOfStock = (item.actual_qty || 0) <= 0;
                      return (
                        <div key={item.name} className="leaderboard-item" style={{ alignItems: 'flex-start' }}>
                          <div>
                            <span className="leaderboard-name" style={{ display: 'block' }}>{item.item_name}</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              SKU: {item.name} | Group: {item.item_group}
                            </span>
                            {item.ordered_qty > 0 && (
                              <span style={{ display: 'block', fontSize: '11px', color: 'var(--color-info)', fontWeight: 600, marginTop: '2px' }}>
                                🔄 {item.ordered_qty} units on order
                              </span>
                            )}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span className={`badge ${isOutOfStock ? 'badge-danger' : 'badge-warning'}`} style={{ marginBottom: '4px' }}>
                              {isOutOfStock ? 'Out of Stock' : 'Low Stock'}
                            </span>
                            <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: isOutOfStock ? 'var(--color-danger)' : 'var(--color-warning)' }}>
                              Qty: {item.actual_qty || 0}
                            </span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>

            {/* Inventory table */}
            <div className="section-card" style={{ marginBottom: '32px' }}>
              <div className="section-card-header">
                <h3 className="section-card-title">Product Catalog Valuation</h3>
              </div>

              {/* Filters Panel */}
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '16px', 
                marginBottom: '20px', 
                padding: '16px', 
                backgroundColor: 'var(--bg-app)', 
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ flex: '1 1 180px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Warehouse</label>
                  <select 
                    value={invWarehouse} 
                    onChange={(e) => setInvWarehouse(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="all">All Warehouses</option>
                    {warehousesList.map(w => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: '1 1 180px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Stock Status</label>
                  <select 
                    value={invStatus} 
                    onChange={(e) => setInvStatus(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="all">All Statuses</option>
                    <option value="instock">In Stock (&gt;15)</option>
                    <option value="low">Low Stock (1-15)</option>
                    <option value="outofstock">Out of Stock (≤0)</option>
                  </select>
                </div>
              </div>

              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product Details</th>
                      <th>Product Group</th>
                      <th>Status</th>
                      <th>Qty on Hand</th>
                      <th>Pending Pipeline</th>
                      <th>Asset Valuation</th>
                      <th>Selling Price</th>
                      <th>Profit Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item: any) => {
                      const margin = item.standard_rate - item.valuation_rate;
                      const qty = item.actual_qty || 0;
                      const isExpanded = !!expandedItems[item.name];
                      
                      let statusBadge = <span className="badge badge-success">In Stock</span>;
                      if (qty <= 0) {
                        statusBadge = <span className="badge badge-danger">Out of Stock</span>;
                      } else if (qty <= 15) {
                        statusBadge = <span className="badge badge-warning">Low Stock</span>;
                      }

                      return (
                        <React.Fragment key={item.name}>
                          <tr 
                            onClick={() => toggleItemExpanded(item.name)} 
                            style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                          >
                            <td style={{ fontWeight: 600 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                                  {isExpanded ? '▼' : '▶'}
                                </span>
                                <div>
                                  <span style={{ display: 'block', color: 'var(--color-primary)', fontWeight: 700 }}>{item.name}</span>
                                  <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{item.item_name}</span>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className="badge badge-info">{item.item_group}</span>
                            </td>
                            <td>{statusBadge}</td>
                            <td style={{ fontWeight: 700, color: qty <= 0 ? 'var(--color-danger)' : qty <= 15 ? 'var(--color-warning)' : 'var(--text-primary)' }}>
                              {formatNumber(qty)}
                            </td>
                            <td style={{ fontSize: '13px' }}>
                              {item.ordered_qty > 0 && (
                                <span style={{ display: 'block', color: 'var(--color-info)', fontWeight: 600 }} title="Pending Purchase Orders">
                                  Ordered: +{formatNumber(item.ordered_qty)}
                                </span>
                              )}
                              {item.reserved_qty > 0 && (
                                <span style={{ display: 'block', color: 'var(--color-warning)', fontWeight: 600 }} title="Committed to Sales Orders">
                                  Reserved: {formatNumber(item.reserved_qty)}
                                </span>
                              )}
                              {item.ordered_qty === 0 && item.reserved_qty === 0 && (
                                <span style={{ color: 'var(--text-muted)' }}>—</span>
                              )}
                            </td>
                            <td style={{ fontWeight: 600 }}>{formatCurrency(item.stock_value)}</td>
                            <td style={{ fontWeight: 600 }}>
                              {item.standard_rate > 0 ? formatCurrency(item.standard_rate) : 'Not Configured'}
                            </td>
                            <td>
                              {item.standard_rate > 0 ? (
                                <span className={`badge ${margin >= 0 ? 'badge-success' : 'badge-danger'}`} style={{ fontWeight: 'bold' }}>
                                  {margin >= 0 ? '+' : ''}{formatCurrency(margin)} ({((margin / item.valuation_rate) * 100).toFixed(0)}%)
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>N/A</span>
                              )}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={8} style={{ backgroundColor: 'var(--bg-app)', padding: '12px 24px' }}>
                                <div style={{ borderLeft: '3px solid var(--color-primary)', paddingLeft: '16px' }}>
                                  <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>
                                    Warehouse Location Stock Breakdown
                                  </h4>
                                  {item.warehouses && item.warehouses.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                      {item.warehouses.map((wh: any, idx: number) => (
                                        <div key={idx} style={{ 
                                          display: 'flex', 
                                          justifyContent: 'space-between', 
                                          fontSize: '12px', 
                                          borderBottom: '1px solid var(--border-color)', 
                                          paddingBottom: '4px',
                                          maxWidth: '500px'
                                        }}>
                                          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{wh.warehouse}</span>
                                          <div style={{ display: 'flex', gap: '16px' }}>
                                            <span>Qty: <strong>{formatNumber(wh.actual_qty)}</strong></span>
                                            <span>Val: <strong>{formatCurrency(wh.stock_value)}</strong></span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No warehouse stock balances recorded.</p>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                    {filteredItems.length === 0 && (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                          No inventory items match the current search or filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// Helper to format percents
function formatPercent(value: number, total: number) {
  if (!total) return 0;
  return ((value / total) * 100).toFixed(0);
}
