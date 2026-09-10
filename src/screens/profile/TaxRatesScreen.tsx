import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTaxRates } from '../../hooks/useTaxRates';
import { TaxRate } from '../../types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/useAuthStore';
import { Radius, Shadow } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { AppBackground } from '../../components/AppBackground';

export const TaxRatesScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const styles = createStyles(colors, insets);
  const nav = useNavigation();
  const user = useAuthStore((s) => s.user);
  const { taxRates, loading, fetch, create, update, remove } = useTaxRates();

  const isBoss = user?.role === 'boss';

  // Add tax slab modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTaxName, setNewTaxName] = useState('');
  const [newTaxRate, setNewTaxRate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch();
  }, []);

  const handleAddTaxSlab = () => {
    if (!isBoss) {
      Alert.alert('Access Denied', 'Only the owner (Boss) can create tax slabs.');
      return;
    }
    setNewTaxName('');
    setNewTaxRate('');
    setShowAddModal(true);
  };

  const handleSaveNewTax = async () => {
    const name = newTaxName.trim();
    const rate = parseFloat(newTaxRate);

    if (!name) {
      Alert.alert('Validation', 'Please enter a tax name.');
      return;
    }
    if (isNaN(rate) || rate < 0 || rate > 100) {
      Alert.alert('Validation', 'Please enter a valid percentage between 0 and 100.');
      return;
    }

    setSaving(true);
    try {
      await create({ name, percentage: rate, is_active: true, is_default: false });
      setShowAddModal(false);
      Alert.alert('Success', `Tax slab "${name}" added successfully.`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create tax slab.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (item: TaxRate) => {
    if (!isBoss) {
      Alert.alert('Access Denied', 'Only the owner (Boss) can toggle tax slabs.');
      return;
    }

    try {
      await update(item.id, { is_active: !item.is_active });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update tax slab.');
    }
  };

  const handleDelete = (item: TaxRate) => {
    if (!isBoss) {
      Alert.alert('Access Denied', 'Only the owner (Boss) can delete tax slabs.');
      return;
    }

    Alert.alert(
      'Delete Tax Slab?',
      `Are you sure you want to delete "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await remove(item.id);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete tax slab.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.screen}>
      <AppBackground />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tax Slabs</Text>
        {isBoss ? (
          <TouchableOpacity onPress={handleAddTaxSlab} style={styles.addBtn}>
            <Ionicons name="add" size={22} color={colors.textInverse} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 38 }} />
        )}
      </View>

      {!isBoss && (
        <View style={styles.employeeBanner}>
          <Ionicons name="information-circle" size={20} color={colors.primary} />
          <Text style={styles.employeeBannerText}>
            Read-only view. Only the owner (Boss) can add or edit tax slabs.
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={taxRates}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <View style={[styles.itemCard, !item.is_active && styles.itemCardInactive]}>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, !item.is_active && styles.textInactive]}>{item.name}</Text>
                <Text style={styles.itemRate}>{item.percentage}%</Text>
              </View>

              <View style={styles.itemActions}>
                {isBoss ? (
                  <>
                    <TouchableOpacity
                      onPress={() => handleToggleActive(item)}
                      style={[
                        styles.actionBtn,
                        item.is_active ? styles.activeBtn : styles.inactiveBtn,
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.actionBtnText}>
                        {item.is_active ? 'Active' : 'Inactive'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleDelete(item)}
                      style={styles.deleteBtn}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.statusRejected} />
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={[styles.badge, item.is_active ? styles.badgeActive : styles.badgeInactive]}>
                    <Text style={styles.badgeText}>{item.is_active ? 'Active' : 'Inactive'}</Text>
                  </View>
                )}
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={52} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No tax slabs configured</Text>
              {isBoss ? (
                <Text style={styles.emptySub}>Tap the + icon to create your first tax rate slab</Text>
              ) : (
                <Text style={styles.emptySub}>Ask your administrator to set up tax slabs</Text>
              )}
            </View>
          }
        />
      )}
      {/* Add Tax Slab Modal — cross-platform replacement for Alert.prompt */}
      <Modal visible={showAddModal} transparent animationType="fade" onRequestClose={() => setShowAddModal(false)}>
        <KeyboardAvoidingView
          style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.5)' }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.addModal}>
            <Text style={styles.addModalTitle}>New Tax Slab</Text>

            <Text style={styles.addModalLabel}>Tax Name</Text>
            <TextInput
              style={styles.addModalInput}
              placeholder="e.g. GST, IGST, VAT"
              placeholderTextColor={colors.textMuted}
              value={newTaxName}
              onChangeText={setNewTaxName}
              autoFocus
            />

            <Text style={styles.addModalLabel}>Rate (%)</Text>
            <TextInput
              style={styles.addModalInput}
              placeholder="e.g. 18"
              placeholderTextColor={colors.textMuted}
              value={newTaxRate}
              onChangeText={setNewTaxRate}
              keyboardType="decimal-pad"
            />

            <View style={styles.addModalActions}>
              <TouchableOpacity
                style={styles.addModalCancel}
                onPress={() => setShowAddModal(false)}
                disabled={saving}
              >
                <Text style={styles.addModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addModalSave, saving && { opacity: 0.6 }]}
                onPress={handleSaveNewTax}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.addModalSaveText}>Add Slab</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const createStyles = (colors: any, insets: any) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Math.max(insets?.top || 0, 24) + 12,
    paddingBottom: 12,
    paddingHorizontal: 20,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContainer: { padding: 20, paddingBottom: 100 },
  employeeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.primary + '15',
    padding: 12,
    borderRadius: Radius.md,
    marginHorizontal: 20,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  employeeBannerText: { flex: 1, fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: Radius.lg,
    marginBottom: 12,
    ...Shadow.sm,
  },
  itemCardInactive: {
    opacity: 0.75,
    backgroundColor: colors.surfaceAlt,
  },
  itemInfo: { flex: 1, gap: 4 },
  itemName: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  itemRate: { fontSize: 14, color: colors.primary, fontWeight: '700' },
  textInactive: { color: colors.textSecondary },
  itemActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  activeBtn: {
    backgroundColor: colors.statusAccepted + '15',
  },
  inactiveBtn: {
    backgroundColor: colors.statusDraft + '15',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  deleteBtn: {
    padding: 6,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  badgeActive: { backgroundColor: colors.statusAccepted + '15' },
  badgeInactive: { backgroundColor: colors.statusDraft + '15' },
  badgeText: { fontSize: 11, fontWeight: '700', color: colors.textSecondary },
  empty: { alignItems: 'center', paddingTop: 100, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  emptySub: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 40 },
  // Add Tax Modal
  addModal: {
    backgroundColor: colors.surface,
    borderRadius: Radius.xl,
    padding: 24,
    ...Shadow.lg,
  },
  addModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 20,
  },
  addModalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  addModalInput: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: Radius.md,
    padding: 12,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 16,
  },
  addModalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  addModalCancel: {
    flex: 1,
    padding: 14,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  addModalCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  addModalSave: {
    flex: 1,
    padding: 14,
    borderRadius: Radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addModalSaveText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
