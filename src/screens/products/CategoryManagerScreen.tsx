import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useCategories } from '../../hooks/useCategories';
import { Category } from '../../types';
import { Colors, Radius, Shadow } from '../../theme';

export const CategoryManagerScreen: React.FC = () => {
  const nav = useNavigation<any>();
  const { categories, loading, fetch, create, update, remove } = useCategories();

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [catUnit, setCatUnit] = useState('Pcs');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch();
  }, []);

  const openCreate = () => {
    setEditTarget(null);
    setCatName('');
    setCatUnit('Pcs');
    setShowForm(true);
  };

  const openEdit = (cat: Category) => {
    setEditTarget(cat);
    setCatName(cat.name);
    setCatUnit(cat.unit_name || 'Pcs');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!catName.trim()) {
      Alert.alert('Error', 'Category name is required');
      return;
    }
    setSaving(true);
    try {
      if (editTarget) {
        await update(editTarget.id, { name: catName.trim(), unit_name: catUnit.trim() });
        Alert.alert('Updated', `Category "${catName.trim()}" updated.`);
      } else {
        await create({ name: catName.trim(), unit_name: catUnit.trim(), is_active: true });
        Alert.alert('Created', `Category "${catName.trim()}" created.`);
      }
      setShowForm(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (cat: Category) => {
    Alert.alert(
      `Delete "${cat.name}"?`,
      'Products assigned to this category will not be deleted but will lose the category label.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await remove(cat.id);
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  const handleToggleActive = async (cat: Category) => {
    try {
      await update(cat.id, { is_active: !cat.is_active });
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Manage Categories</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate} activeOpacity={0.8}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={fetch}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="grid-outline" size={52} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No categories yet</Text>
            <Text style={styles.emptySub}>Tap + to create your first category</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.catCard, !item.is_active && styles.catCardInactive]}>
            <View style={styles.catIconWrap}>
              <Ionicons name="grid-outline" size={22} color={item.is_active ? Colors.accent : Colors.textMuted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.catName, !item.is_active && styles.catNameInactive]}>
                {item.name}
              </Text>
              {item.unit_name ? (
                <Text style={styles.catMeta}>Unit: {item.unit_name}</Text>
              ) : null}
            </View>
            <View style={styles.catActions}>
              <TouchableOpacity
                style={styles.actionIcon}
                onPress={() => handleToggleActive(item)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={item.is_active ? 'eye-outline' : 'eye-off-outline'}
                  size={18}
                  color={item.is_active ? Colors.accent : Colors.textMuted}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionIcon}
                onPress={() => openEdit(item)}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={18} color={Colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionIcon}
                onPress={() => handleDelete(item)}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={18} color={Colors.statusRejected} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Create/Edit Modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editTarget ? 'Edit Category' : 'New Category'}
            </Text>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <Text style={styles.label}>Category Name *</Text>
            <TextInput
              style={styles.input}
              value={catName}
              onChangeText={setCatName}
              placeholder="e.g. Electronics, Apparel..."
              placeholderTextColor={Colors.textMuted}
              autoFocus
            />

            <Text style={[styles.label, { marginTop: 16 }]}>Default Unit</Text>
            <TextInput
              style={styles.input}
              value={catUnit}
              onChangeText={setCatUnit}
              placeholder="e.g. Pcs, Kg, Litre..."
              placeholderTextColor={Colors.textMuted}
            />

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>
                  {editTarget ? 'Save Changes' : 'Create Category'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  addBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  catCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 10,
    ...Shadow.sm,
  },
  catCardInactive: { opacity: 0.5 },
  catIconWrap: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: Colors.accent + '15',
    alignItems: 'center', justifyContent: 'center',
  },
  catName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  catNameInactive: { color: Colors.textMuted },
  catMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  catActions: { flexDirection: 'row', gap: 4 },
  actionIcon: {
    width: 34, height: 34, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  empty: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  emptySub: { fontSize: 14, color: Colors.textSecondary },
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  modalBody: { padding: 20 },
  label: {
    fontSize: 12, fontWeight: '700', color: Colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    paddingHorizontal: 14, paddingVertical: 14,
    fontSize: 15, color: Colors.textPrimary,
    borderWidth: 1, borderColor: Colors.border,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
