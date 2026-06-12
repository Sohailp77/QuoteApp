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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTaxRates } from '../../hooks/useTaxRates';
import { TaxRate } from '../../types';
import { useAuthStore } from '../../store/useAuthStore';
import { Colors, Radius, Shadow } from '../../theme';

export const TaxRatesScreen: React.FC = () => {
  const nav = useNavigation();
  const user = useAuthStore((s) => s.user);
  const { taxRates, loading, fetch, create, update, remove } = useTaxRates();

  const isBoss = user?.role === 'boss';

  const [modalVisible, setModalVisible] = useState(false);
  const [newSlabName, setNewSlabName] = useState('');
  const [newSlabPercentage, setNewSlabPercentage] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetch();
  }, []);

  const handleAddTaxSlab = () => {
    if (!isBoss) {
      Alert.alert('Access Denied', 'Only the owner (Boss) can create tax slabs.');
      return;
    }
    setNewSlabName('');
    setNewSlabPercentage('');
    setModalVisible(true);
  };

  const handleCreateTaxSlab = async () => {
    if (!newSlabName.trim()) {
      Alert.alert('Error', 'Please enter a tax slab name.');
      return;
    }

    const rate = parseFloat(newSlabPercentage);
    if (isNaN(rate) || rate < 0) {
      Alert.alert('Error', 'Please enter a valid rate percentage.');
      return;
    }

    setAdding(true);
    try {
      await create({
        name: newSlabName.trim(),
        percentage: rate,
        is_active: true,
        is_default: false,
      });
      setModalVisible(false);
      Alert.alert('Success', `Tax slab "${newSlabName.trim()}" added successfully.`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create tax slab.');
    } finally {
      setAdding(false);
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tax Slabs</Text>
        {isBoss ? (
          <TouchableOpacity onPress={handleAddTaxSlab} style={styles.addBtn}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 38 }} />
        )}
      </View>

      {!isBoss && (
        <View style={styles.employeeBanner}>
          <Ionicons name="information-circle" size={20} color={Colors.accent} />
          <Text style={styles.employeeBannerText}>
            Read-only view. Only the owner (Boss) can add or edit tax slabs.
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Colors.accent} />
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
                      <Ionicons name="trash-outline" size={18} color={Colors.statusRejected} />
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
              <Ionicons name="receipt-outline" size={52} color={Colors.textMuted} />
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

      {/* Custom Add Tax Slab Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Tax Slab</Text>
            
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Tax Name *</Text>
              <TextInput
                style={styles.input}
                value={newSlabName}
                onChangeText={setNewSlabName}
                placeholder="e.g. GST 18%"
                placeholderTextColor={Colors.textMuted}
                autoFocus
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Tax Rate (%) *</Text>
              <TextInput
                style={styles.input}
                value={newSlabPercentage}
                onChangeText={setNewSlabPercentage}
                placeholder="e.g. 18"
                placeholderTextColor={Colors.textMuted}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={[styles.modalBtn, styles.modalCancelBtn]}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreateTaxSlab}
                style={[styles.modalBtn, styles.modalCreateBtn]}
                disabled={adding}
              >
                {adding ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalCreateBtnText}>Create Slab</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 20,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContainer: { padding: 20, paddingBottom: 100 },
  employeeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.accent + '15',
    padding: 12,
    borderRadius: Radius.md,
    marginHorizontal: 20,
    marginTop: 10,
    borderWidth: 1,
    borderColor: Colors.accent + '30',
  },
  employeeBannerText: { flex: 1, fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: Radius.lg,
    marginBottom: 12,
    ...Shadow.sm,
  },
  itemCardInactive: {
    opacity: 0.75,
    backgroundColor: Colors.surfaceAlt,
  },
  itemInfo: { flex: 1, gap: 4 },
  itemName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  itemRate: { fontSize: 14, color: Colors.accent, fontWeight: '700' },
  textInactive: { color: Colors.textSecondary },
  itemActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  activeBtn: {
    backgroundColor: Colors.statusAccepted + '15',
  },
  inactiveBtn: {
    backgroundColor: Colors.statusDraft + '15',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  deleteBtn: {
    padding: 6,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  badgeActive: { backgroundColor: Colors.statusAccepted + '15' },
  badgeInactive: { backgroundColor: Colors.statusDraft + '15' },
  badgeText: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary },
  empty: { alignItems: 'center', paddingTop: 100, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  emptySub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: 40 },
  
  // Custom Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 20,
    width: '100%',
    maxWidth: 340,
    ...Shadow.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  fieldWrap: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 10,
  },
  modalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
  },
  modalCancelBtn: {
    backgroundColor: Colors.surfaceAlt,
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  modalCreateBtn: {
    backgroundColor: Colors.primary,
  },
  modalCreateBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});
