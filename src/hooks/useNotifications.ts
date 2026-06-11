import { useMemo } from 'react';
import { Quote } from '../types';
import { Product } from '../types';

export type NotificationPriority = 'critical' | 'warning' | 'info';

export interface AppNotification {
  id: string;
  priority: NotificationPriority;
  title: string;
  body: string;
  icon: string;
  iconColor: string;
  actionScreen?: string;
  actionParams?: Record<string, any>;
}

const LOW_STOCK_THRESHOLD = 5;

export const useNotifications = (
  quotes: Quote[],
  products: Product[]
): AppNotification[] => {
  return useMemo(() => {
    const notifications: AppNotification[] = [];
    const now = new Date();

    // 1. Low stock & out of stock
    products.forEach((p) => {
      if (p.stock_quantity === undefined || p.stock_quantity === null) return;
      const reorderAt = p.reorder_level ?? LOW_STOCK_THRESHOLD;
      if (p.stock_quantity === 0) {
        notifications.push({
          id: `oos-${p.id}`,
          priority: 'critical',
          title: 'Out of Stock',
          body: `"${p.name}" has 0 units remaining.`,
          icon: 'alert-circle',
          iconColor: '#EF4444',
          actionScreen: 'StockManagement',
        });
      } else if (p.stock_quantity <= reorderAt) {
        notifications.push({
          id: `low-${p.id}`,
          priority: 'warning',
          title: 'Low Stock',
          body: `"${p.name}" is running low — only ${p.stock_quantity} left.`,
          icon: 'warning-outline',
          iconColor: '#F59E0B',
          actionScreen: 'StockManagement',
        });
      }
    });

    // 2. Accepted quotes — delivery alerts
    const acceptedWithDelivery = quotes.filter(
      (q) => q.status === 'Accepted' && q.delivery_date
    );

    acceptedWithDelivery.forEach((q) => {
      const deliveryDate = new Date(q.delivery_date!);
      const diffDays = Math.ceil(
        (deliveryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (q.delivery_status !== 'Delivered') {
        if (deliveryDate < now) {
          notifications.push({
            id: `overdue-${q.id}`,
            priority: 'critical',
            title: 'Overdue Delivery',
            body: `Quote ${q.quote_number} for ${q.client_name} was due on ${new Date(q.delivery_date!).toLocaleDateString('en-IN')}.`,
            icon: 'time',
            iconColor: '#EF4444',
            actionScreen: 'QuoteDetail',
            actionParams: { quoteId: q.id },
          });
        } else if (diffDays <= 3) {
          notifications.push({
            id: `upcoming-${q.id}`,
            priority: 'warning',
            title: 'Upcoming Delivery',
            body: `Quote ${q.quote_number} for ${q.client_name} is due in ${diffDays} day${diffDays !== 1 ? 's' : ''}.`,
            icon: 'bicycle-outline',
            iconColor: '#F59E0B',
            actionScreen: 'QuoteDetail',
            actionParams: { quoteId: q.id },
          });
        }
      }
    });

    // 3. Pending payments on accepted quotes
    const pendingPayments = quotes.filter(
      (q) => q.status === 'Accepted' && q.payment_status === 'Pending'
    );
    if (pendingPayments.length > 0) {
      const total = pendingPayments.reduce((s, q) => s + q.total, 0);
      notifications.push({
        id: 'pending-payments',
        priority: 'warning',
        title: 'Pending Payments',
        body: `${pendingPayments.length} accepted quote${pendingPayments.length > 1 ? 's' : ''} with pending payment — ₹${total.toLocaleString('en-IN')}.`,
        icon: 'card-outline',
        iconColor: '#3B82F6',
        actionScreen: 'Quotes',
      });
    }

    // Sort: critical → warning → info
    const priority: Record<NotificationPriority, number> = { critical: 0, warning: 1, info: 2 };
    return notifications.sort((a, b) => priority[a.priority] - priority[b.priority]);
  }, [quotes, products]);
};
