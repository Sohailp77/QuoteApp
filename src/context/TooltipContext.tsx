import React, { createContext, useContext, useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from './ThemeContext';
import { Radius, Shadow } from '../theme';

interface TooltipContextType {
  showTooltip: (content: string, title?: string) => void;
  hideTooltip: () => void;
}

const TooltipContext = createContext<TooltipContextType>({
  showTooltip: () => {},
  hideTooltip: () => {},
});

export const useTooltip = () => useContext(TooltipContext);

export const TooltipProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { colors } = useAppTheme();
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('Full Details');
  const [content, setContent] = useState('');

  const showTooltip = (text: string, customTitle?: string) => {
    if (!text || text.trim() === '') return;
    setContent(text);
    setTitle(customTitle || 'Full Details');
    setVisible(true);
  };

  const hideTooltip = () => {
    setVisible(false);
  };

  const styles = createStyles(colors);

  return (
    <TooltipContext.Provider value={{ showTooltip, hideTooltip }}>
      {children}

      <Modal visible={visible} transparent animationType="fade" onRequestClose={hideTooltip}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={hideTooltip}>
          <TouchableOpacity style={styles.card} activeOpacity={1} onPress={() => {}}>
            <View style={styles.header}>
              <View style={styles.titleRow}>
                <View style={styles.iconBox}>
                  <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
                </View>
                <Text style={styles.titleText} numberOfLines={1}>
                  {title}
                </Text>
              </View>
              <TouchableOpacity onPress={hideTooltip} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={true}>
              <Text style={styles.contentText} selectable>
                {content}
              </Text>
            </ScrollView>

            <TouchableOpacity style={styles.dismissBtn} onPress={hideTooltip} activeOpacity={0.85}>
              <Text style={styles.dismissBtnText}>Close</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </TooltipContext.Provider>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
    backgroundColor: colors.surface,
    borderRadius: Radius.xl,
    padding: 20,
    ...Shadow.lg,
    borderWidth: 1,
    borderColor: colors.border + '60',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '40',
    paddingBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  closeBtn: {
    padding: 4,
  },
  scrollArea: {
    maxHeight: 300,
    marginBottom: 16,
  },
  scrollContent: {
    paddingVertical: 4,
  },
  contentText: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  dismissBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
