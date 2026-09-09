import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAppTheme } from '../../context/ThemeContext';
import { Radius, Shadow } from '../../theme';
import { Button } from './Button';

export interface FilterOption {
  id: string;
  label: string;
}

export interface FilterGroup {
  id: string;
  title: string;
  options: FilterOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
}

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  groups: FilterGroup[];
  onReset: () => void;
  onApply: () => void;
  // Optional Custom Date Range
  customDate?: {
    enabled: boolean;
    startDate: Date;
    endDate: Date;
    onStartDateChange: (d: Date) => void;
    onEndDateChange: (d: Date) => void;
  };
}

export const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onClose,
  title = 'Filter & Sort',
  groups,
  onReset,
  onApply,
  customDate,
}) => {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors, insets);

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Modal Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="options" size={20} color={colors.primary} />
            <Text style={styles.headerTitle}>{title}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity onPress={onReset} style={styles.resetBtn}>
              <Text style={styles.resetText}>Reset All</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Filter Groups */}
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {groups.map((group) => (
            <View key={group.id} style={styles.section}>
              <Text style={styles.sectionTitle}>{group.title}</Text>
              <View style={styles.optionsWrap}>
                {group.options.map((opt) => {
                  const isSelected = group.selectedValue === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[
                        styles.chip,
                        isSelected && styles.chipSelected,
                      ]}
                      onPress={() => group.onSelect(opt.id)}
                      activeOpacity={0.7}
                    >
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={16} color="#fff" style={{ marginRight: 4 }} />
                      )}
                      <Text
                        style={[
                          styles.chipText,
                          isSelected && styles.chipTextSelected,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}

          {/* Custom Date Range Picker Section */}
          {customDate?.enabled && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Custom Date Range</Text>
              <View style={styles.datePickerRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dateLabel}>From Date</Text>
                  <TouchableOpacity
                    style={styles.dateBtn}
                    onPress={() => setShowStartPicker(true)}
                  >
                    <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                    <Text style={styles.dateBtnText}>
                      {customDate.startDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.dateLabel}>To Date</Text>
                  <TouchableOpacity
                    style={styles.dateBtn}
                    onPress={() => setShowEndPicker(true)}
                  >
                    <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                    <Text style={styles.dateBtnText}>
                      {customDate.endDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {showStartPicker && (
                <DateTimePicker
                  value={customDate.startDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, d) => {
                    setShowStartPicker(false);
                    if (d) customDate.onStartDateChange(d);
                  }}
                />
              )}

              {showEndPicker && (
                <DateTimePicker
                  value={customDate.endDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, d) => {
                    setShowEndPicker(false);
                    if (d) customDate.onEndDateChange(d);
                  }}
                />
              )}
            </View>
          )}
        </ScrollView>

        {/* Modal Footer */}
        <View style={styles.footer}>
          <Button title="Apply Filters" onPress={onApply} />
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: any, insets: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: Math.max(insets?.top || 0, 24) + 12,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    resetBtn: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: Radius.full,
      backgroundColor: colors.surfaceAlt,
    },
    resetText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: {
      padding: 20,
      paddingBottom: 40,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 12,
    },
    optionsWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: Radius.full,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    chipSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chipText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    chipTextSelected: {
      color: '#ffffff',
      fontWeight: '700',
    },
    datePickerRow: {
      flexDirection: 'row',
      gap: 12,
    },
    dateLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 6,
    },
    dateBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: Radius.md,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    dateBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    footer: {
      padding: 20,
      borderTopWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      ...Shadow.md,
    },
  });
