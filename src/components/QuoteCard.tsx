import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Quote } from '../types';
import { Badge } from './ui/Badge';
import { Radius, Shadow } from '../theme';
import { useAppTheme } from '../context/ThemeContext';

import { TooltipText } from './ui/TooltipText';

interface QuoteCardProps {
  quote: Quote;
  onPress: () => void;
  onDelete?: () => void;
}

const formatCurrency = (amount: number) =>
  `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

export const QuoteCard: React.FC<QuoteCardProps> = ({ quote, onPress, onDelete }) => {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TooltipText style={styles.quoteNumber} numberOfLines={1} tooltipTitle="Quote Number">
            {quote.quote_number}
          </TooltipText>
          <Badge label={quote.status} status={quote.status} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.amount} numberOfLines={1}>{formatCurrency(quote.total)}</Text>
          {onDelete && (
            <TouchableOpacity onPress={(e) => { e.stopPropagation(); onDelete(); }} style={{ padding: 4 }}>
              <Ionicons name="trash-outline" size={18} color="#E53935" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.footer}>
        <View style={styles.clientRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{quote.client_name ? quote.client_name.charAt(0).toUpperCase() : 'C'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <TooltipText style={styles.clientName} numberOfLines={1} tooltipTitle="Client Name">
              {quote.client_name}
            </TooltipText>
            {quote.client_email ? (
              <TooltipText style={styles.clientEmail} numberOfLines={1} tooltipTitle="Client Email">
                {quote.client_email}
              </TooltipText>
            ) : null}
          </View>
        </View>
        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
          <Text style={styles.date} numberOfLines={1}>
            {new Date(quote.created_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 12,
    ...Shadow.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: { gap: 6 },
  quoteNumber: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  amount: { fontSize: 18, fontWeight: '700', color: colors.primary },
  divider: { height: 1, backgroundColor: colors.divider, marginBottom: 12 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 8 },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  clientName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  clientEmail: { fontSize: 12, color: colors.textSecondary },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  date: { fontSize: 12, color: colors.textMuted },
});
