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
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCategories } from '../../hooks/useCategories';
import { Radius, Shadow } from '../../theme';
import { Button } from '../../components/ui/Button';
import { useAppTheme } from '../../context/ThemeContext';
import { AppBackground } from '../../components/AppBackground';

export const ProductCategoriesScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const styles = createStyles(colors, insets);
  const nav = useNavigation();
  const { categories, loading, fetch, create, update, remove } = useCategories();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catUnit, setCatUnit] = useState('Pcs');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch();
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setCatName('');
    setCatDesc('');
    setCatUnit('Pcs');
    setShowAddModal(true);
  };

  const openEditModal = (id: string, name: string, desc: string, unit: string) => {
    setEditingId(id);
    setCatName(name);
    setCatDesc(desc);
    setCatUnit(unit);
    setShowAddModal(true);
  };

  const handleSubmit = async () => {
    if (!catName.trim()) {
      Alert.alert('Required', 'Category name is required.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await update(editingId, {
          name: catName.trim(),
          description: catDesc.trim(),
          unit_name: catUnit.trim(),
        });
        Alert.alert('Success', 'Category updated successfully.');
      } else {
        await create({
          name: catName.trim(),
          unit_name: catUnit.trim() || undefined,
          is_active: true,
        });
        Alert.alert('Success', 'Category created successfully.');
      }
      setShowAddModal(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save category.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      'Delete Category?',
      `Are you sure you want to delete "${name}"? This won't delete products under this category, but they won't have a category reference.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await remove(id);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete category.');
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
        <Text style={styles.headerTitle}>Product Categories</Text>
        <TouchableOpacity onPress={openAddModal} style={styles.addBtn}>
          <Ionicons name="add" size={22} color={colors.textInverse} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={categories}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <View style={styles.itemCard}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                {item.description ? (
                  <Text style={styles.itemDesc}>{item.description}</Text>
                ) : null}
                <Text style={styles.itemUnit}>Default Unit: {item.unit_name || 'Pcs'}</Text>
              </View>

              <View style={styles.itemActions}>
                <TouchableOpacity
                  onPress={() => openEditModal(item.id, item.name, item.description || '', item.unit_name || 'Pcs')}
                  style={styles.actionBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="create-outline" size={18} color={colors.primary} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleDelete(item.id, item.name)}
                  style={styles.actionBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.statusRejected} />
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="grid-outline" size={52} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No categories yet</Text>
              <Text style={styles.emptySub}>Tap the + icon to create your first product category</Text>
            </View>
          }
        />
      )}

      {/* Add/Edit Modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingId ? 'Edit Category' : 'New Category'}
            </Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Category Name *</Text>
              <TextInput
                style={styles.input}
                value={catName}
                onChangeText={setCatName}
                placeholder="e.g. Electrical, Plumbing"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
                value={catDesc}
                onChangeText={setCatDesc}
                placeholder="Optional details about this category..."
                placeholderTextColor={colors.textMuted}
                multiline
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Default Unit (e.g. Pcs, Box, Metres)</Text>
              <TextInput
                style={styles.input}
                value={catUnit}
                onChangeText={setCatUnit}
                placeholder="e.g. Pcs"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={{ marginTop: 24 }}>
              <Button
                title={editingId ? 'Save Changes' : 'Create Category'}
                onPress={handleSubmit}
                loading={submitting}
                size="lg"
              />
            </View>
          </ScrollView>
        </View>
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
  itemInfo: { flex: 1, gap: 4, paddingRight: 12 },
  itemName: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  itemDesc: { fontSize: 13, color: colors.textSecondary },
  itemUnit: { fontSize: 11, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
  itemActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  actionBtn: { padding: 6 },
  empty: { alignItems: 'center', paddingTop: 100, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  emptySub: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 40 },
  
  // Modal styles
  modal: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  modalContent: { padding: 20, gap: 16 },
  fieldWrap: { gap: 6 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
  },
});
