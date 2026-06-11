import { useMemo } from 'react';
import { Quote } from '../types';

export interface RevenuePoint {
  label: string;
  value: number;
}

export interface Analytics {
  totalRevenue: number;
  todayRevenue: number;
  thisMonthRevenue: number;
  thisYearRevenue: number;
  pendingPaymentsTotal: number;
  pendingPaymentsCount: number;
  acceptedCount: number;
  draftCount: number;
  rejectedCount: number;
  topProducts: { name: string; count: number; revenue: number }[];
  monthlyRevenue: RevenuePoint[];
  weeklyRevenue: RevenuePoint[];
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export const useAnalytics = (quotes: Quote[]): Analytics => {
  return useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const accepted = quotes.filter((q) => q.status === 'Accepted');

    const totalRevenue = accepted.reduce((s, q) => s + q.total, 0);

    const todayRevenue = accepted
      .filter((q) => new Date(q.created_at) >= todayStart)
      .reduce((s, q) => s + q.total, 0);

    const thisMonthRevenue = accepted
      .filter((q) => new Date(q.created_at) >= monthStart)
      .reduce((s, q) => s + q.total, 0);

    const thisYearRevenue = accepted
      .filter((q) => new Date(q.created_at) >= yearStart)
      .reduce((s, q) => s + q.total, 0);

    const pendingPayments = accepted.filter((q) => q.payment_status === 'Pending');
    const pendingPaymentsTotal = pendingPayments.reduce((s, q) => s + q.total, 0);

    // Top products from line items
    const productMap: Record<string, { name: string; count: number; revenue: number }> = {};
    accepted.forEach((q) => {
      (q.items || []).forEach((item) => {
        if (!productMap[item.product_name]) {
          productMap[item.product_name] = { name: item.product_name, count: 0, revenue: 0 };
        }
        productMap[item.product_name].count += item.quantity;
        productMap[item.product_name].revenue += item.line_total;
      });
    });
    const topProducts = Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Monthly revenue (last 6 months)
    const monthlyRevenue: RevenuePoint[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const val = accepted
        .filter((q) => {
          const dt = new Date(q.created_at);
          return dt >= d && dt < end;
        })
        .reduce((s, q) => s + q.total, 0);
      monthlyRevenue.push({ label: MONTH_NAMES[d.getMonth()], value: val });
    }

    // Weekly revenue (last 7 days)
    const weeklyRevenue: RevenuePoint[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i + 1);
      const val = accepted
        .filter((q) => {
          const dt = new Date(q.created_at);
          return dt >= d && dt < end;
        })
        .reduce((s, q) => s + q.total, 0);
      weeklyRevenue.push({ label: DAY_NAMES[d.getDay()], value: val });
    }

    return {
      totalRevenue,
      todayRevenue,
      thisMonthRevenue,
      thisYearRevenue,
      pendingPaymentsTotal,
      pendingPaymentsCount: pendingPayments.length,
      acceptedCount: accepted.length,
      draftCount: quotes.filter((q) => q.status === 'Draft').length,
      rejectedCount: quotes.filter((q) => q.status === 'Rejected').length,
      topProducts,
      monthlyRevenue,
      weeklyRevenue,
    };
  }, [quotes]);
};
