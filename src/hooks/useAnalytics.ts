import { useMemo } from 'react';
import { Quote, Reorder, DirectSale } from '../types';

export interface RevenuePoint {
  label: string;
  value: number;
}

export interface EmployeeRevenue {
  userId: string;
  revenue: number;
  quotesCount: number;
  percentage: number;
}

export interface Analytics {
  totalRevenue: number;
  todayRevenue: number;
  thisMonthRevenue: number;
  thisYearRevenue: number;
  pendingPaymentsTotal: number;
  pendingPaymentsCount: number;
  totalQuotesCount: number;
  acceptedCount: number;
  sentCount: number;
  draftCount: number;
  rejectedCount: number;
  conversionRate: number;
  averageQuoteValue: number;
  totalReorderCost: number;
  thisMonthReorderCost: number;
  totalDirectSalesRevenue: number;
  thisMonthDirectSalesRevenue: number;
  netProfit: number;
  totalDirectSalesCount: number;
  topProducts: { name: string; count: number; revenue: number; percentage: number }[];
  monthlyRevenue: RevenuePoint[];
  weeklyRevenue: RevenuePoint[];
  customChartPoints: RevenuePoint[];
  employeeRevenue: EmployeeRevenue[];
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const useAnalytics = (
  quotes: Quote[],
  reorders: Reorder[],
  directSales: DirectSale[],
  dateRange?: { start: Date; end: Date }
): Analytics => {
  return useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const filteredQuotes = dateRange
      ? quotes.filter((q) => {
          const dt = new Date(q.created_at);
          return dt >= dateRange.start && dt <= dateRange.end;
        })
      : quotes;

    const filteredDirectSales = dateRange
      ? directSales.filter((ds) => {
          const dt = new Date(ds.created_at);
          return dt >= dateRange.start && dt <= dateRange.end;
        })
      : directSales;

    const filteredReorders = dateRange
      ? reorders.filter((r) => {
          const dt = new Date(r.created_at);
          return dt >= dateRange.start && dt <= dateRange.end;
        })
      : reorders;

    const acceptedQuotes = filteredQuotes.filter((q) => q.status === 'Accepted');
    const sentCount = filteredQuotes.filter((q) => q.status === 'Sent').length;
    const draftCount = filteredQuotes.filter((q) => q.status === 'Draft').length;
    const rejectedCount = filteredQuotes.filter((q) => q.status === 'Rejected').length;

    // Quote Revenues
    const quotesTotalRevenue = acceptedQuotes.reduce((s, q) => s + q.total, 0);
    const quotesTodayRevenue = acceptedQuotes
      .filter((q) => new Date(q.created_at) >= todayStart)
      .reduce((s, q) => s + q.total, 0);
    const quotesMonthRevenue = acceptedQuotes
      .filter((q) => new Date(q.created_at) >= monthStart)
      .reduce((s, q) => s + q.total, 0);
    const quotesYearRevenue = acceptedQuotes
      .filter((q) => new Date(q.created_at) >= yearStart)
      .reduce((s, q) => s + q.total, 0);

    // Direct Sales Revenues
    const totalDirectSalesRevenue = filteredDirectSales.reduce((s, ds) => s + (ds.total || 0), 0);
    const todayDirectSalesRevenue = filteredDirectSales
      .filter((ds) => new Date(ds.created_at) >= todayStart)
      .reduce((s, ds) => s + (ds.total || 0), 0);
    const thisMonthDirectSalesRevenue = directSales
      .filter((ds) => new Date(ds.created_at) >= monthStart)
      .reduce((s, ds) => s + (ds.total || 0), 0);
    const thisYearDirectSalesRevenue = directSales
      .filter((ds) => new Date(ds.created_at) >= yearStart)
      .reduce((s, ds) => s + (ds.total || 0), 0);

    // Combined Revenues (Quotes + Direct Sales)
    const totalRevenue = quotesTotalRevenue + totalDirectSalesRevenue;
    const todayRevenue = quotesTodayRevenue + todayDirectSalesRevenue;
    const thisMonthRevenue = quotesMonthRevenue + thisMonthDirectSalesRevenue;
    const thisYearRevenue = quotesYearRevenue + thisYearDirectSalesRevenue;

    // Pending Payments (Quotes + Direct Sales)
    const pendingQuotes = acceptedQuotes.filter((q) => q.payment_status === 'Pending' || !q.payment_status);
    const pendingDirectSales = filteredDirectSales.filter((ds) => ds.payment_status === 'Pending' || ds.payment_status === 'Partial');

    const pendingPaymentsTotal =
      pendingQuotes.reduce((s, q) => s + q.total, 0) +
      pendingDirectSales.reduce((s, ds) => s + (ds.total || 0), 0);
    const pendingPaymentsCount = pendingQuotes.length + pendingDirectSales.length;

    const totalQuotesCount = filteredQuotes.length;
    const conversionRate = totalQuotesCount > 0 ? (acceptedQuotes.length / totalQuotesCount) * 100 : 0;
    const averageQuoteValue = acceptedQuotes.length > 0 ? quotesTotalRevenue / acceptedQuotes.length : 0;

    // Top products from line items (Quotes + Direct Sales)
    const productMap: Record<string, { name: string; count: number; revenue: number }> = {};
    
    acceptedQuotes.forEach((q) => {
      (q.items || []).forEach((item) => {
        if (!productMap[item.product_name]) {
          productMap[item.product_name] = { name: item.product_name, count: 0, revenue: 0 };
        }
        productMap[item.product_name].count += item.quantity;
        productMap[item.product_name].revenue += item.line_total;
      });
    });

    filteredDirectSales.forEach((ds) => {
      (ds.items || []).forEach((item) => {
        const pName = item.product_name || 'Custom Product';
        if (!productMap[pName]) {
          productMap[pName] = { name: pName, count: 0, revenue: 0 };
        }
        productMap[pName].count += item.quantity;
        productMap[pName].revenue += item.line_total;
      });
    });

    const topProducts = Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map((p) => ({
        ...p,
        percentage: totalRevenue > 0 ? (p.revenue / totalRevenue) * 100 : 0,
      }));

    // Employee / Team revenue (Quotes + Direct Sales)
    const empMap: Record<string, { userId: string; revenue: number; quotesCount: number }> = {};
    acceptedQuotes.forEach((q) => {
      const uid = q.user_id || 'owner';
      if (!empMap[uid]) {
        empMap[uid] = { userId: uid, revenue: 0, quotesCount: 0 };
      }
      empMap[uid].revenue += q.total;
      empMap[uid].quotesCount += 1;
    });

    filteredDirectSales.forEach((ds) => {
      const uid = ds.user_id || ds.created_by_name || 'owner';
      if (!empMap[uid]) {
        empMap[uid] = { userId: uid, revenue: 0, quotesCount: 0 };
      }
      empMap[uid].revenue += (ds.total || 0);
      empMap[uid].quotesCount += 1;
    });

    const employeeRevenue: EmployeeRevenue[] = Object.values(empMap)
      .sort((a, b) => b.revenue - a.revenue)
      .map((emp) => ({
        ...emp,
        percentage: totalRevenue > 0 ? (emp.revenue / totalRevenue) * 100 : 0,
      }));

    // Monthly revenue (Quotes + Direct Sales last 6 months)
    const monthlyRevenue: RevenuePoint[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      const qVal = acceptedQuotes
        .filter((q) => {
          const dt = new Date(q.created_at);
          return dt >= d && dt < end;
        })
        .reduce((s, q) => s + q.total, 0);

      const dsVal = directSales
        .filter((ds) => {
          const dt = new Date(ds.created_at);
          return dt >= d && dt < end;
        })
        .reduce((s, ds) => s + (ds.total || 0), 0);

      monthlyRevenue.push({ label: MONTH_NAMES[d.getMonth()], value: qVal + dsVal });
    }

    // Weekly revenue (Quotes + Direct Sales last 7 days)
    const weeklyRevenue: RevenuePoint[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i + 1);

      const qVal = acceptedQuotes
        .filter((q) => {
          const dt = new Date(q.created_at);
          return dt >= d && dt < end;
        })
        .reduce((s, q) => s + q.total, 0);

      const dsVal = directSales
        .filter((ds) => {
          const dt = new Date(ds.created_at);
          return dt >= d && dt < end;
        })
        .reduce((s, ds) => s + (ds.total || 0), 0);

      weeklyRevenue.push({ label: DAY_NAMES[d.getDay()], value: qVal + dsVal });
    }

    // Dynamic Custom Date Range Chart Points
    const customChartPoints: RevenuePoint[] = [];
    if (dateRange) {
      const diffTime = Math.abs(dateRange.end.getTime() - dateRange.start.getTime());
      const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

      if (diffDays <= 14) {
        for (let i = 0; i < diffDays; i++) {
          const d = new Date(dateRange.start.getFullYear(), dateRange.start.getMonth(), dateRange.start.getDate() + i);
          const endD = new Date(dateRange.start.getFullYear(), dateRange.start.getMonth(), dateRange.start.getDate() + i + 1);

          const qVal = acceptedQuotes
            .filter((q) => {
              const dt = new Date(q.created_at);
              return dt >= d && dt < endD;
            })
            .reduce((s, q) => s + q.total, 0);

          const dsVal = filteredDirectSales
            .filter((ds) => {
              const dt = new Date(ds.created_at);
              return dt >= d && dt < endD;
            })
            .reduce((s, ds) => s + (ds.total || 0), 0);

          const label = `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
          customChartPoints.push({ label, value: qVal + dsVal });
        }
      } else {
        const bucketSize = diffTime / 6;
        for (let i = 0; i < 6; i++) {
          const d = new Date(dateRange.start.getTime() + i * bucketSize);
          const endD = new Date(dateRange.start.getTime() + (i + 1) * bucketSize);

          const qVal = acceptedQuotes
            .filter((q) => {
              const dt = new Date(q.created_at);
              return dt >= d && dt < endD;
            })
            .reduce((s, q) => s + q.total, 0);

          const dsVal = filteredDirectSales
            .filter((ds) => {
              const dt = new Date(ds.created_at);
              return dt >= d && dt < endD;
            })
            .reduce((s, ds) => s + (ds.total || 0), 0);

          const label = `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
          customChartPoints.push({ label, value: qVal + dsVal });
        }
      }
    }

    const totalReorderCost = filteredReorders
      .filter((r) => (r.total_paid || 0) > 0)
      .reduce((s, r) => s + (r.total_paid || 0), 0);

    const thisMonthReorderCost = reorders
      .filter((r) => new Date(r.created_at) >= monthStart && (r.total_paid || 0) > 0)
      .reduce((s, r) => s + (r.total_paid || 0), 0);

    const netProfit = totalRevenue - totalReorderCost;
    const totalDirectSalesCount = filteredDirectSales.length;

    return {
      totalRevenue,
      todayRevenue,
      thisMonthRevenue,
      thisYearRevenue,
      pendingPaymentsTotal,
      pendingPaymentsCount,
      totalQuotesCount,
      acceptedCount: acceptedQuotes.length,
      sentCount,
      draftCount,
      rejectedCount,
      conversionRate,
      averageQuoteValue,
      totalReorderCost,
      thisMonthReorderCost,
      totalDirectSalesRevenue,
      thisMonthDirectSalesRevenue,
      netProfit,
      totalDirectSalesCount,
      topProducts,
      monthlyRevenue,
      weeklyRevenue,
      customChartPoints,
      employeeRevenue,
    };
  }, [quotes, reorders, directSales, dateRange]);
};
