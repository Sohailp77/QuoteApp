import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Radius, Shadow } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { ReorderCreateTab } from './ReorderCreateTab';
import { ReorderHistoryTab } from './ReorderHistoryTab';

type TabId = 'create' | 'history';

export const ReorderStockScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const s = styles(colors, insets);
  const nav = useNavigation<any>();
  const [tab, setTab] = useState<TabId>('create');

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>Reorder Stock</Text>
        <View style={{ width: 38 }} />
      </View>

      <View style={s.tabRow}>
        {([
          { id: 'create', label: 'Create Order', icon: 'add-circle-outline' },
          { id: 'history', label: 'Orders & Receive', icon: 'receipt-outline' },
        ] as { id: TabId; label: string; icon: string }[]).map(t => (
          <TouchableOpacity
            key={t.id}
            style={[s.tabBtn, tab === t.id && s.tabBtnActive]}
            onPress={() => setTab(t.id)}
          >
            <Ionicons
              name={t.icon as any}
              size={14}
              color={tab === t.id ? colors.primary : colors.textMuted}
            />
            <Text style={[s.tabText, tab === t.id && s.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'create' ? (
        <ReorderCreateTab onOrderCreated={() => setTab('history')} />
      ) : (
        <ReorderHistoryTab />
      )}
    </View>
  );
};

const styles = (colors: any, insets?: any) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Math.max(insets?.top || 0, 24) + 12, paddingBottom: 12, paddingHorizontal: 20,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  tabRow: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 8,
    backgroundColor: colors.surfaceAlt, borderRadius: Radius.full, padding: 4,
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: Radius.full,
  },
  tabBtnActive: { backgroundColor: colors.surface, ...Shadow.sm },
  tabText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: colors.primary },
});
