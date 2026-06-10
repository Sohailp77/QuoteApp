import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useQuotes } from '../../hooks/useQuotes';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Colors, Radius, Shadow, StatusColors } from '../../theme';
import { Quote, QuoteStatus } from '../../types';

const formatCurrency = (amount: number) =>
  `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const STATUS_SEQUENCE: QuoteStatus[] = ['Draft', 'Sent', 'Accepted', 'Rejected', 'Expired'];

export const QuoteDetailScreen: React.FC = () => {
  const nav = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: { quoteId: string } }, 'params'>>();
  const { quoteId } = route.params;
  const { getById, updateQuoteDetails, remove } = useQuotes();
  
  const [updating, setUpdating] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Edit fields
  const [payStatus, setPayStatus] = useState<'Pending' | 'Partial' | 'Paid'>('Pending');
  const [payMethod, setPayMethod] = useState('');
  const [delStatus, setDelStatus] = useState<'Pending' | 'Shipped' | 'Delivered'>('Pending');
  const [delDate, setDelDate] = useState('');
  const [delPartner, setDelPartner] = useState('');
  const [trackingNum, setTrackingNum] = useState('');
  const [delNote, setDelNote] = useState('');

  const quote = getById(quoteId);
  if (!quote) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Quote not found</Text>
        <Button title="Go Back" onPress={() => nav.goBack()} variant="ghost" />
      </View>
    );
  }

  const handleStatusChange = async (status: QuoteStatus) => {
    setUpdating(true);
    try {
      await updateQuoteDetails(quoteId, { status });
      Alert.alert('Success', `Quote marked as ${status}`);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleOpenEditModal = () => {
    setPayStatus(quote.payment_status || 'Pending');
    setPayMethod(quote.payment_method || '');
    setDelStatus(quote.delivery_status || 'Pending');
    setDelDate(quote.delivery_date || '');
    setDelPartner(quote.delivery_partner || '');
    setTrackingNum(quote.tracking_number || '');
    setDelNote(quote.delivery_note || '');
    setShowEditModal(true);
  };

  const handleSaveDetails = async () => {
    setUpdating(true);
    try {
      await updateQuoteDetails(quoteId, {
        payment_status: payStatus,
        payment_method: payMethod.trim(),
        delivery_status: delStatus,
        delivery_date: delDate.trim(),
        delivery_partner: delPartner.trim(),
        tracking_number: trackingNum.trim(),
        delivery_note: delNote.trim(),
      });
      setShowEditModal(false);
      Alert.alert('Success', 'Delivery and Payment information updated successfully.');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Quote', 'This action cannot be undone. Product stock will be restored if this quote is currently Accepted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await remove(quoteId);
          nav.goBack();
        },
      },
    ]);
  };

  const statusColor = StatusColors[quote.status] || Colors.textMuted;

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{quote.quote_number}</Text>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={20} color={Colors.statusRejected} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Status & Amount Hero */}
        <View style={[styles.hero, { borderLeftColor: statusColor }]}>
          <View style={styles.heroTop}>
            <Badge label={quote.status} status={quote.status} />
            <Text style={styles.heroAmount}>{formatCurrency(quote.total)}</Text>
          </View>
          <Text style={styles.heroDate}>
            Created {new Date(quote.created_at).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}
          </Text>
          <Text style={styles.heroExpiry}>
            Valid until {new Date(quote.valid_until).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}
          </Text>
        </View>

        {/* Client Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client</Text>
          <View style={styles.clientCard}>
            <View style={styles.clientAvatar}>
              <Text style={styles.clientAvatarText}>
                {quote.client_name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.clientName}>{quote.client_name}</Text>
              <Text style={styles.clientEmail}>{quote.client_email}</Text>
              {quote.client_phone ? (
                <Text style={styles.clientEmail}>{quote.client_phone}</Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* Delivery & Payment Info Card (Only visible if Quote is Accepted) */}
        {quote.status === 'Accepted' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Delivery & Payment</Text>
              <TouchableOpacity
                style={styles.editInfoBtn}
                onPress={handleOpenEditModal}
              >
                <Ionicons name="create-outline" size={16} color={Colors.accent} />
                <Text style={styles.editInfoText}>Update Info</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="card-outline" size={20} color={Colors.textSecondary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Payment Status</Text>
                  <Text style={styles.infoValue}>
                    {quote.payment_status || 'Pending'} {quote.payment_method ? `• ${quote.payment_method}` : ''}
                  </Text>
                </View>
              </View>

              <View style={styles.infoDivider} />

              <View style={styles.infoRow}>
                <Ionicons name="bus-outline" size={20} color={Colors.textSecondary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Delivery Status</Text>
                  <Text style={styles.infoValue}>
                    {quote.delivery_status || 'Pending'}
                  </Text>
                </View>
              </View>

              {(quote.delivery_date || quote.delivery_partner || quote.tracking_number || quote.delivery_note) ? (
                <>
                  <View style={styles.infoDivider} />
                  
                  {quote.delivery_date ? (
                    <View style={styles.infoRow}>
                      <Ionicons name="calendar-outline" size={20} color={Colors.textSecondary} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.infoLabel}>Expected Delivery Date</Text>
                        <Text style={styles.infoValue}>{quote.delivery_date}</Text>
                      </View>
                    </View>
                  ) : null}

                  {quote.delivery_partner ? (
                    <View style={styles.infoRow}>
                      <Ionicons name="people-outline" size={20} color={Colors.textSecondary} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.infoLabel}>Delivery Partner</Text>
                        <Text style={styles.infoValue}>{quote.delivery_partner}</Text>
                      </View>
                    </View>
                  ) : null}

                  {quote.tracking_number ? (
                    <View style={styles.infoRow}>
                      <Ionicons name="barcode-outline" size={20} color={Colors.textSecondary} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.infoLabel}>Tracking Number / Link</Text>
                        <Text style={styles.infoValue}>{quote.tracking_number}</Text>
                      </View>
                    </View>
                  ) : null}

                  {quote.delivery_note ? (
                    <View style={styles.infoRow}>
                      <Ionicons name="document-text-outline" size={20} color={Colors.textSecondary} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.infoLabel}>Delivery Instructions</Text>
                        <Text style={styles.infoValue}>{quote.delivery_note}</Text>
                      </View>
                    </View>
                  ) : null}
                </>
              ) : null}
            </View>
          </View>
        )}

        {/* Line Items */}
        {quote.items && quote.items.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Items</Text>
            <View style={styles.itemsTable}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, { flex: 3 }]}>Product</Text>
                <Text style={[styles.tableCell, styles.tableRight]}>Qty</Text>
                <Text style={[styles.tableCell, styles.tableRight]}>Total</Text>
              </View>
              {quote.items.map((item, idx) => (
                <View key={idx} style={styles.tableRow}>
                  <View style={{ flex: 3 }}>
                    <Text style={styles.itemName}>{item.product_name}</Text>
                    <Text style={styles.itemUnit}>{formatCurrency(item.unit_price)} each</Text>
                    {item.discount > 0 && (
                      <Text style={styles.itemDiscount}>{item.discount}% off</Text>
                    )}
                  </View>
                  <Text style={[styles.tableCell, styles.tableRight]}>{item.quantity}</Text>
                  <Text style={[styles.tableCell, styles.tableRight, styles.itemTotal]}>
                    {formatCurrency(item.line_total)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Totals */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.totalsCard}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{formatCurrency(quote.subtotal)}</Text>
            </View>
            {quote.discount > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Discount</Text>
                <Text style={[styles.totalValue, { color: Colors.statusAccepted }]}>
                  -{formatCurrency(quote.discount)}
                </Text>
              </View>
            )}
            {quote.tax > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Tax (GST)</Text>
                <Text style={styles.totalValue}>{formatCurrency(quote.tax)}</Text>
              </View>
            )}
            <View style={styles.divider} />
            <View style={styles.totalRow}>
              <Text style={styles.totalFinalLabel}>Total</Text>
              <Text style={styles.totalFinal}>{formatCurrency(quote.total)}</Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {quote.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notes}>{quote.notes}</Text>
          </View>
        ) : null}

        {/* Status Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Update Status</Text>
          <View style={styles.statusActions}>
            {STATUS_SEQUENCE.filter((s) => s !== quote.status).map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.statusBtn, { borderColor: StatusColors[s] }]}
                onPress={() => handleStatusChange(s)}
                disabled={updating}
                activeOpacity={0.8}
              >
                <Text style={[styles.statusBtnText, { color: StatusColors[s] }]}>
                  Mark as {s}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Edit Logistics & Finance Modal */}
      <Modal visible={showEditModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Update Delivery & Payment</Text>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Payment Status Dropdown Selector */}
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Payment Status</Text>
              <View style={styles.chipsContainer}>
                {(['Pending', 'Partial', 'Paid'] as const).map((s) => {
                  const isSelected = payStatus === s;
                  return (
                    <TouchableOpacity
                      key={s}
                      style={[styles.chip, isSelected && styles.chipSelected]}
                      onPress={() => setPayStatus(s)}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                        {s}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Payment Method</Text>
              <TextInput
                style={styles.input}
                value={payMethod}
                onChangeText={setPayMethod}
                placeholder="e.g. UPI, Bank Transfer, Cash"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            {/* Delivery Status Dropdown Selector */}
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Delivery Status</Text>
              <View style={styles.chipsContainer}>
                {(['Pending', 'Shipped', 'Delivered'] as const).map((s) => {
                  const isSelected = delStatus === s;
                  return (
                    <TouchableOpacity
                      key={s}
                      style={[styles.chip, isSelected && styles.chipSelected]}
                      onPress={() => setDelStatus(s)}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                        {s}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Expected Delivery Date</Text>
              <TextInput
                style={styles.input}
                value={delDate}
                onChangeText={setDelDate}
                placeholder="e.g. 15-Jun-2026 or YYYY-MM-DD"
                placeholderTextColor={Colors.textMuted}
              />
              <View style={styles.presets}>
                <TouchableOpacity
                  style={styles.presetBtn}
                  onPress={() => {
                    const today = new Date();
                    setDelDate(today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-'));
                  }}
                >
                  <Text style={styles.presetText}>Today</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.presetBtn}
                  onPress={() => {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    setDelDate(tomorrow.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-'));
                  }}
                >
                  <Text style={styles.presetText}>Tomorrow</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Delivery Partner (Logistics Partner)</Text>
              <TextInput
                style={styles.input}
                value={delPartner}
                onChangeText={setDelPartner}
                placeholder="e.g. Delhivery, BlueDart, Self Delivery"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Tracking Number / Link</Text>
              <TextInput
                style={styles.input}
                value={trackingNum}
                onChangeText={setTrackingNum}
                placeholder="e.g. Tracking ID #1823901"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Delivery Instructions / Note</Text>
              <TextInput
                style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
                value={delNote}
                onChangeText={setDelNote}
                placeholder="Specific delivery gate or instructions..."
                placeholderTextColor={Colors.textMuted}
                multiline
              />
            </View>

            <View style={{ marginTop: 16 }}>
              <Button
                title="Save Info"
                onPress={handleSaveDetails}
                loading={updating}
                size="lg"
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  notFoundText: { fontSize: 18, color: Colors.textSecondary },
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
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  deleteBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.statusRejected + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 20,
    borderLeftWidth: 4,
    ...Shadow.sm,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  heroAmount: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  heroDate: { fontSize: 13, color: Colors.textSecondary, marginBottom: 2 },
  heroExpiry: { fontSize: 13, color: Colors.textMuted },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: 14,
    ...Shadow.sm,
  },
  clientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientAvatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  clientName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  clientEmail: { fontSize: 13, color: Colors.textSecondary },
  itemsTable: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  tableCell: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, flex: 1 },
  tableRight: { textAlign: 'right' },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    gap: 8,
    alignItems: 'center',
  },
  itemName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  itemUnit: { fontSize: 12, color: Colors.textMuted },
  itemDiscount: { fontSize: 11, color: Colors.statusAccepted, fontWeight: '600' },
  itemTotal: { fontWeight: '700', color: Colors.textPrimary, fontSize: 14 },
  totalsCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: 16,
    gap: 10,
    ...Shadow.sm,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { fontSize: 14, color: Colors.textSecondary },
  totalValue: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  divider: { height: 1, backgroundColor: Colors.divider },
  totalFinalLabel: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary },
  totalFinal: { fontSize: 20, fontWeight: '800', color: Colors.primary },
  notes: {
    fontSize: 14,
    color: Colors.textSecondary,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: 14,
    lineHeight: 22,
    ...Shadow.sm,
  },
  statusActions: { gap: 10 },
  statusBtn: {
    borderWidth: 1.5,
    borderRadius: Radius.full,
    paddingVertical: 12,
    alignItems: 'center',
  },
  statusBtnText: { fontSize: 14, fontWeight: '700' },
  
  // Delivery & Payment Info UI
  editInfoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editInfoText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.accent,
  },
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: 16,
    ...Shadow.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  infoDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: 12,
  },

  // Modal styling
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  modalContent: { padding: 20, gap: 16, paddingBottom: 60 },
  fieldWrap: { gap: 6 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  chipsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    flex: 1,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.full,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: Colors.accent + '15',
    borderColor: Colors.accent,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  chipTextSelected: {
    color: Colors.accent,
    fontWeight: '700',
  },
  presets: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  presetBtn: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  presetText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
});
