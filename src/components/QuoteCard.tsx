import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Quote } from '../types';
import { Badge } from './ui/Badge';
import { Radius, Shadow } from '../theme';
import { useAppTheme } from '../context/ThemeContext';

interface QuoteCardProps {
  quote: Quote;
  onPress: () => void;
}

const formatCurrency = (amount: number) =>
  `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

export const QuoteCard: React.FC<QuoteCardProps> = ({ quote, onPress }) => {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.quoteNumber}>{quote.quote_number}</Text>
          <Badge label={quote.status} status={quote.status} />
        </View>
        <Text style={styles.amount}>{formatCurrency(quote.total)}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.footer}>
        <View style={styles.clientRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{quote.client_name.charAt(0).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.clientName}>{quote.client_name}</Text>
            <Text style={styles.clientEmail}>{quote.client_email}</Text>
          </View>
        </View>
        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
          <Text style={styles.date}>
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
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
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
