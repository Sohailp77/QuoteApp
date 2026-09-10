import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useQuotes } from '../../hooks/useQuotes';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Radius, Shadow } from '../../theme';
import { Quote, QuoteStatus } from '../../types';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCompanySettings } from '../../hooks/useCompanySettings';
import { useProducts } from '../../hooks/useProducts';
import { tablesDB, DATABASE_ID, COLLECTIONS, Query } from '../../config/appwrite';
import { useAppTheme } from '../../context/ThemeContext';

const formatCurrency = (amount: number) =>
  `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const STATUS_SEQUENCE: QuoteStatus[] = ['Draft', 'Sent', 'Accepted', 'Rejected', 'Expired'];

// ── Safe helpers to prevent PDF crash on invalid dates/nulls ────────────
const safeDateFmt = (dateStr: string | undefined | null, opts?: Intl.DateTimeFormatOptions): string => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-IN', opts || { day: 'numeric', month: 'short', year: 'numeric' });
};

const safeNum = (val: number | null | undefined): number => {
  const n = Number(val);
  return isNaN(n) ? 0 : n;
};

const safeLocale = (val: number | null | undefined): string => {
  return safeNum(val).toLocaleString('en-IN');
};
// ────────────────────────────────────────────────────────────────────────

import { generateQuotePDFHtml } from '../../utils/pdfTemplates';

export const QuoteDetailScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const styles = createStyles(colors, insets);
  const nav = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: { quoteId: string } }, 'params'>>();
  const { quoteId } = route.params;
  const { fetchById, updateQuoteDetails, updateStatus, remove } = useQuotes();
  const { products, fetch: fetchProducts } = useProducts();

  const { settings: company, fetch: fetchCompany } = useCompanySettings();
  const [pdfLoading, setPdfLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [fetching, setFetching] = useState(true);

  const [updating, setUpdating] = useState(false);
  const [updatingStatusTarget, setUpdatingStatusTarget] = useState<QuoteStatus | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Edit fields
  const [payStatus, setPayStatus] = useState<'Pending' | 'Partial' | 'Paid'>('Pending');
  const [payMethod, setPayMethod] = useState('');
  const [delStatus, setDelStatus] = useState<'Pending' | 'Shipped' | 'Delivered'>('Pending');
  const [delDate, setDelDate] = useState('');
  const [delPartner, setDelPartner] = useState('');
  const [trackingNum, setTrackingNum] = useState('');
  const [delNote, setDelNote] = useState('');

  const loadQuote = useCallback(async () => {
    setFetching(true);
    const data = await fetchById(quoteId);
    if (data) {
      setQuote(data);
      // Initialize edit fields
      setPayStatus(data.payment_status || 'Pending');
      setPayMethod(data.payment_method || '');
      setDelStatus(data.delivery_status || 'Pending');
      setDelDate(data.delivery_date || '');
      setDelPartner(data.delivery_partner || '');
      setTrackingNum(data.tracking_number || '');
      setDelNote(data.delivery_note || '');
    }
    setFetching(false);
  }, [quoteId, fetchById]);

  useEffect(() => {
    fetchCompany();
    loadQuote();
    fetchProducts();
  }, [fetchCompany, loadQuote, fetchProducts]);

  const generateHTML = () => {
    if (!quote || !company) return '';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Quote ${quote.quote_number}</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 30px;
      color: #333;
      font-size: 14px;
      line-height: 1.5;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    .company-name {
      font-size: 24px;
      font-weight: bold;
      color: #0F0F1A;
      margin-bottom: 5px;
    }
    .company-details {
      color: #666;
      font-size: 12px;
      line-height: 1.4;
    }
    .title-cell {
      text-align: right;
      vertical-align: top;
    }
    .quote-title {
      font-size: 28px;
      font-weight: 800;
      color: #6C63FF;
      margin: 0 0 10px 0;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .quote-meta {
      font-size: 13px;
      color: #333;
      line-height: 1.5;
    }
    .quote-meta span {
      font-weight: bold;
    }
    .divider {
      height: 2px;
      background-color: #6C63FF;
      margin: 20px 0;
    }
    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    .details-cell {
      width: 50%;
      vertical-align: top;
    }
    .section-title {
      font-size: 12px;
      font-weight: bold;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .client-info {
      font-size: 14px;
      line-height: 1.5;
    }
    .client-name {
      font-weight: bold;
      color: #0F0F1A;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    .items-table th {
      background-color: #0F0F1A;
      color: #ffffff;
      text-align: left;
      padding: 10px;
      font-size: 12px;
      text-transform: uppercase;
      font-weight: bold;
    }
    .items-table td {
      padding: 12px 10px;
      border-bottom: 1px solid #eee;
      font-size: 13px;
    }
    .items-table tr:last-child td {
      border-bottom: 2px solid #0F0F1A;
    }
    .totals-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 40px;
    }
    .totals-label {
      width: 80%;
      text-align: right;
      padding: 6px 10px;
      font-size: 13px;
      color: #666;
    }
    .totals-value {
      width: 20%;
      text-align: right;
      padding: 6px 10px;
      font-size: 13px;
      font-weight: bold;
      color: #333;
    }
    .final-row .totals-label {
      font-size: 16px;
      font-weight: bold;
      color: #0F0F1A;
      padding-top: 12px;
    }
    .final-row .totals-value {
      font-size: 18px;
      font-weight: bold;
      color: #6C63FF;
      padding-top: 12px;
    }
    .footer-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 30px;
      font-size: 12px;
      color: #555;
      background-color: #f9f9fb;
      border: 1px solid #eee;
      border-radius: 6px;
    }
    .footer-cell {
      padding: 15px;
      vertical-align: top;
      width: 50%;
    }
    .footer-title {
      font-weight: bold;
      color: #0F0F1A;
      margin-bottom: 6px;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.5px;
    }
    .thankyou {
      text-align: center;
      margin-top: 40px;
      font-size: 14px;
      font-style: italic;
      color: #888;
    }
  </style>
</head>
<body>
  <table class="header-table">
    <tr>
      <td>
        <div class="company-name">${company.company_name || 'QUOTEAPP CORP'}</div>
        <div class="company-details">
          ${company.address ? `${company.address}<br>` : ''}
          ${company.phone ? `Phone: ${company.phone} &nbsp;|&nbsp; ` : ''}
          ${company.email ? `Email: ${company.email}` : ''}
          ${company.gst_number ? `<br>GSTIN: <strong>${company.gst_number}</strong>` : ''}
        </div>
      </td>
      <td class="title-cell">
        <h1 class="quote-title">Quotation</h1>
        <div class="quote-meta">
          Quote #: <strong>${quote.quote_number}</strong><br>
          Date: <span>${safeDateFmt(quote.created_at)}</span><br>
          Valid Until: <span>${safeDateFmt(quote.valid_until)}</span>
        </div>
      </td>
    </tr>
  </table>

  <div class="divider"></div>

  <table class="details-table">
    <tr>
      <td class="details-cell">
        <div class="section-title">Quotation For</div>
        <div class="client-info">
          <div class="client-name">${quote.client_name}</div>
          <div>${quote.client_email}</div>
          ${quote.client_phone ? `<div>Phone: ${quote.client_phone}</div>` : ''}
        </div>
      </td>
      <td class="details-cell" style="text-align: right;">
        <div class="section-title">Status</div>
        <div style="font-size: 16px; font-weight: bold; color: ${
          quote.status === 'Accepted' ? '#2EC4B6' : quote.status === 'Rejected' ? '#FF1E27' : '#6C63FF'
        };">
          ${quote.status}
        </div>
      </td>
    </tr>
  </table>

  <table class="items-table">
    <thead>
      <tr>
        <th style="width: 5%">#</th>
        <th style="width: 50%">Product / Service Description</th>
        <th style="width: 15%; text-align: right;">MRP</th>
        <th style="width: 10%; text-align: center;">Qty</th>
        <th style="width: 10%; text-align: center;">Disc %</th>
        <th style="width: 15%; text-align: right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${(quote.items || []).map((item, idx) => {
        let descHtml = `<strong>${item.product_name}</strong>`;
        if (item.formula_text) {
          descHtml += `<div style="font-size: 11px; color: #666; margin-top: 3px;">
            Formula: ${item.formula_text}
          </div>`;
        } else if (item.calc_mode === 'size') {
          descHtml += `<div style="font-size: 11px; color: #666; margin-top: 3px;">
            Size: ${item.length} &times; ${item.width} | Area: ${item.area} | Pcs: ${item.pcs}
          </div>`;
        } else if (item.calc_mode === 'area') {
          descHtml += `<div style="font-size: 11px; color: #666; margin-top: 3px;">
            Area: ${item.area} | Pcs: ${item.pcs}
          </div>`;
        } else if (item.calc_mode === 'length') {
          descHtml += `<div style="font-size: 11px; color: #666; margin-top: 3px;">
            Length: ${item.length} | Pcs: ${item.pcs}
          </div>`;
        } else if (item.calc_mode === 'weight') {
          descHtml += `<div style="font-size: 11px; color: #666; margin-top: 3px;">
            Weight: ${item.pcs}
          </div>`;
        }
        
        const unitLabel = item.selling_unit ? ` ${item.selling_unit}` : '';
        return `
          <tr>
            <td>${idx + 1}</td>
            <td>${descHtml}</td>
            <td style="text-align: right;">₹${safeLocale(item.unit_price)}</td>
            <td style="text-align: center;">${safeNum(item.quantity)}${unitLabel}</td>
            <td style="text-align: center;">${safeNum(item.discount)}%</td>
            <td style="text-align: right; font-weight: bold;">₹${safeLocale(item.line_total)}</td>
          </tr>
        `;
      }).join('')}
    </tbody>
  </table>

  <table class="totals-table">
    <tr>
      <td class="totals-label">Subtotal (MRP)</td>
      <td class="totals-value">₹${safeLocale(quote.subtotal)}</td>
    </tr>
    ${safeNum(quote.discount) > 0 ? `
      <tr>
        <td class="totals-label">Discount (${safeNum(quote.subtotal) > 0 ? `${((safeNum(quote.discount) / safeNum(quote.subtotal)) * 100).toFixed(1)}%` : '0%'})</td>
        <td class="totals-value" style="color: #2EC4B6;">-₹${safeLocale(quote.discount)}</td>
      </tr>
    ` : ''}
    ${safeNum(quote.tax) > 0 ? `
      <tr>
        <td class="totals-label">Tax (GST)</td>
        <td class="totals-value">₹${safeLocale(quote.tax)}</td>
      </tr>
    ` : ''}
    <tr class="final-row">
      <td class="totals-label">Grand Total</td>
      <td class="totals-value">₹${safeLocale(quote.total)}</td>
    </tr>
  </table>

  <table class="footer-table">
    <tr>
      ${company.bank_name || company.account_number ? `
        <td class="footer-cell" style="border-right: 1px solid #eee;">
          <div class="footer-title">Bank Details (For Payments)</div>
          <div>Bank Name: <strong>${company.bank_name || 'N/A'}</strong></div>
          <div>Account Number: <strong>${company.account_number || 'N/A'}</strong></div>
          <div>IFSC Code: <strong>${company.ifsc_code || 'N/A'}</strong></div>
        </td>
      ` : ''}
      
      ${quote.status === 'Accepted' && (quote.delivery_date || quote.delivery_partner) ? `
        <td class="footer-cell">
          <div class="footer-title">Delivery & Logistics</div>
          <div>Delivery Partner: <strong>${quote.delivery_partner || 'Pending'}</strong></div>
          ${quote.tracking_number ? `<div>Tracking #: <strong>${quote.tracking_number}</strong></div>` : ''}
          ${quote.delivery_date ? `<div>Expected Date: <strong>${new Date(quote.delivery_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></div>` : ''}
          <div>Delivery Status: <strong>${quote.delivery_status || 'Pending'}</strong></div>
        </td>
      ` : `
        <td class="footer-cell">
          <div class="footer-title">Terms &amp; Conditions</div>
          <div>1. Validity: ${quote.valid_until ? (() => { const d1 = new Date(quote.created_at); const d2 = new Date(quote.valid_until); const days = isNaN(d1.getTime()) || isNaN(d2.getTime()) ? 0 : Math.max(0, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24))); return days > 0 ? `${days} days (until ${safeDateFmt(quote.valid_until)})` : safeDateFmt(quote.valid_until); })() : 'As per mutual agreement'}.</div>
          <div>2. Deliveries will be executed as per schedule.</div>
        </td>
      `}
    </tr>
  </table>

  <div class="thankyou">
    Thank you for choosing ${company.company_name || 'our services'}!
  </div>
</body>
</html>
    `;
  };

  if (fetching) {
    return (
      <View style={styles.notFound}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!quote) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Quote not found</Text>
        <Button title="Go Back" onPress={() => nav.goBack()} variant="ghost" />
      </View>
    );
  }

  const handleSharePDF = async () => {
    if (!quote) return;
    setPdfLoading(true);
    try {
      const docType = quote.status === 'Accepted' ? 'INVOICE' : 'QUOTATION';
      const html = generateQuotePDFHtml(quote, company, docType);

      const { uri } = await Print.printToFileAsync({ html });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Share Quote ${quote.quote_number}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Error', 'Sharing is not available on this device');
      }
    } catch (e: any) {
      Alert.alert('PDF Error', e.message || 'Failed to generate PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const executeAcceptQuote = async (targetQuote: Quote) => {
    await updateStatus(quoteId, 'Accepted');
    setQuote((prev) => (prev ? { ...prev, status: 'Accepted' } : null));
    fetchProducts(true);
    Alert.alert('Status Updated', 'Quote marked as Accepted and inventory updated.');
  };

  const executeRevertAcceptedQuote = async (targetQuote: Quote, nextStatus: QuoteStatus) => {
    await updateStatus(quoteId, nextStatus);
    setQuote((prev) => (prev ? { ...prev, status: nextStatus } : null));
    fetchProducts(true);
    Alert.alert('Status Updated', `Quote marked as ${nextStatus} and inventory returned.`);
  };

  const handleStatusChange = async (newStatus: QuoteStatus) => {
    if (!quote) return;
    setUpdating(true);
    setUpdatingStatusTarget(newStatus);
    try {
      if (quote.status === 'Accepted' && newStatus !== 'Accepted') {
        await executeRevertAcceptedQuote(quote, newStatus);
      } else if (newStatus === 'Accepted') {
        const lowStockItems: Array<{ name: string; requested: number; available: number }> = [];
        const items = quote.items || [];
        for (const item of items) {
          if (item.product_id) {
            const prod = products.find((p) => p.id === item.product_id);
            const availableStock = prod?.stock_quantity ?? 0;
            if (availableStock < item.quantity) {
              lowStockItems.push({
                name: item.product_name,
                requested: item.quantity,
                available: availableStock,
              });
            }
          }
        }

        if (lowStockItems.length > 0) {
          const itemListStr = lowStockItems
            .map((i) => `- ${i.name}: requested ${i.requested}, available ${i.available}`)
            .join('\n');
          
          Alert.alert(
            'Insufficient Stock',
            `Cannot accept quote due to insufficient stock for the following items:\n\n${itemListStr}\n\nPlease modify the quote or wait for stock to be replenished.`,
            [
              {
                text: 'Edit Quote',
                onPress: () => {
                  setUpdating(false);
                  setUpdatingStatusTarget(null);
                  nav.navigate('CreateQuote', { quoteId });
                },
              },
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => {
                  setUpdating(false);
                  setUpdatingStatusTarget(null);
                },
              },
            ]
          );
          return;
        } else {
          await executeAcceptQuote(quote);
        }
      } else {
        await updateStatus(quoteId, newStatus);
        setQuote((prev) => (prev ? { ...prev, status: newStatus } : null));
        Alert.alert('Status Updated', `Quote marked as ${newStatus}`);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setUpdating(false);
      setUpdatingStatusTarget(null);
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
      const updated = await updateQuoteDetails(quoteId, {
        payment_status: payStatus,
        payment_method: payMethod.trim(),
        delivery_status: delStatus,
        delivery_date: delDate.trim(),
        delivery_partner: delPartner.trim(),
        tracking_number: trackingNum.trim(),
        delivery_note: delNote.trim(),
      });
      if (updated) {
        setQuote(updated);
      }
      setShowEditModal(false);
      Alert.alert('Success', 'Delivery and Payment information updated successfully.');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Quote',
      'This action cannot be undone. Product stock will be restored if this quote is currently Accepted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await remove(quoteId);
              nav.goBack();
            } catch (e: any) {
              setDeleting(false);
              Alert.alert('Delete Failed', e.message || 'Could not delete this quote. Please try again.');
            }
          },
        },
      ]
    );
  };

  const statusColor = colors[`status${quote.status}`] || colors.textMuted;

  return (
    <View style={styles.screen}>
      {/* Deletion loading overlay */}
      {deleting && (
        <View style={styles.deletingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.deletingText}>Deleting quote…{'\n'}Restoring stock if applicable</Text>
        </View>
      )}
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn} disabled={deleting}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{quote.quote_number}</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {quote.status !== 'Accepted' && !deleting && (
            <TouchableOpacity onPress={() => nav.navigate('CreateQuote', { quoteId })} style={styles.editBtn}>
              <Ionicons name="create-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleSharePDF} style={styles.shareBtn} disabled={pdfLoading || deleting}>
            {pdfLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="share-social-outline" size={20} color={colors.primary} />
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn} disabled={deleting}>
            <Ionicons name="trash-outline" size={20} color={colors.statusRejected} />
          </TouchableOpacity>
        </View>
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
          <View style={styles.barcodeWrapper}>
            <View style={styles.barcodeLines}>
              {Array.from(quote.quote_number).map((char, index) => {
                const val = char.charCodeAt(0) % 4;
                const width = val === 0 ? 1 : val === 1 ? 2 : val === 2 ? 3 : 4;
                return (
                  <View
                    key={index}
                    style={[
                      styles.barcodeBar,
                      { width, backgroundColor: colors.textPrimary, marginRight: index % 2 === 0 ? 2 : 1 },
                    ]}
                  />
                );
              })}
            </View>
            <Text style={styles.barcodeText}>{quote.quote_number}</Text>
          </View>
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
                <Ionicons name="create-outline" size={16} color={colors.primary} />
                <Text style={styles.editInfoText}>Update Info</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="card-outline" size={20} color={colors.textSecondary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Payment Status</Text>
                  <Text style={styles.infoValue}>
                    {quote.payment_status || 'Pending'} {quote.payment_method ? `• ${quote.payment_method}` : ''}
                  </Text>
                </View>
              </View>

              <View style={styles.infoDivider} />

              <View style={styles.infoRow}>
                <Ionicons name="bus-outline" size={20} color={colors.textSecondary} />
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
                      <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.infoLabel}>Expected Delivery Date</Text>
                        <Text style={styles.infoValue}>{quote.delivery_date}</Text>
                      </View>
                    </View>
                  ) : null}

                  {quote.delivery_partner ? (
                    <View style={styles.infoRow}>
                      <Ionicons name="people-outline" size={20} color={colors.textSecondary} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.infoLabel}>Delivery Partner</Text>
                        <Text style={styles.infoValue}>{quote.delivery_partner}</Text>
                      </View>
                    </View>
                  ) : null}

                  {quote.tracking_number ? (
                    <View style={styles.infoRow}>
                      <Ionicons name="barcode-outline" size={20} color={colors.textSecondary} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.infoLabel}>Tracking Number / Link</Text>
                        <Text style={styles.infoValue}>{quote.tracking_number}</Text>
                      </View>
                    </View>
                  ) : null}

                  {quote.delivery_note ? (
                    <View style={styles.infoRow}>
                      <Ionicons name="document-text-outline" size={20} color={colors.textSecondary} />
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
                    <Text style={styles.itemUnit}>MRP: {formatCurrency(item.unit_price)} per {item.selling_unit || 'unit'}</Text>
                    {item.formula_text ? (
                      <Text style={styles.itemDimensions}>
                        {item.formula_text}
                      </Text>
                    ) : item.calc_mode === 'size' ? (
                      <Text style={styles.itemDimensions}>
                        Size: {item.length} × {item.width} | Area: {item.area} | Pcs: {item.pcs}
                      </Text>
                    ) : item.calc_mode === 'area' ? (
                      <Text style={styles.itemDimensions}>
                        Area: {item.area} | Pcs: {item.pcs}
                      </Text>
                    ) : item.calc_mode === 'length' ? (
                      <Text style={styles.itemDimensions}>
                        Length: {item.length} | Pcs: {item.pcs}
                      </Text>
                    ) : item.calc_mode === 'weight' ? (
                      <Text style={styles.itemDimensions}>
                        Weight: {item.pcs}
                      </Text>
                    ) : null}
                    {item.discount > 0 && (
                      <Text style={styles.itemDiscount}>{item.discount}% off</Text>
                    )}
                  </View>
                  <Text style={[styles.tableCell, styles.tableRight]}>
                    {item.quantity} {item.selling_unit || ''}
                  </Text>
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
              <Text style={styles.totalLabel}>Subtotal (MRP)</Text>
              <Text style={styles.totalValue}>{formatCurrency(quote.subtotal)}</Text>
            </View>
            {quote.discount > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>
                  Discount {quote.subtotal > 0 ? `(${((quote.discount / quote.subtotal) * 100).toFixed(1)}%)` : ''}
                </Text>
                <Text style={[styles.totalValue, { color: colors.statusAccepted }]}>
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
            {STATUS_SEQUENCE.filter((s) => s !== quote.status).map((s) => {
              const isThisBtnUpdating = updating && updatingStatusTarget === s;
              return (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.statusBtn,
                    { borderColor: colors[`status${s}`] },
                    isThisBtnUpdating && { opacity: 0.8 }
                  ]}
                  onPress={() => handleStatusChange(s)}
                  disabled={updating}
                  activeOpacity={0.8}
                >
                  {isThisBtnUpdating ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <ActivityIndicator size="small" color={colors[`status${s}`]} />
                      <Text style={[styles.statusBtnText, { color: colors[`status${s}`] }]}>
                        Updating...
                      </Text>
                    </View>
                  ) : (
                    <Text style={[styles.statusBtnText, { color: colors[`status${s}`] }]}>
                      Mark as {s}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
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
              <Ionicons name="close" size={24} color={colors.textPrimary} />
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
                placeholderTextColor={colors.textMuted}
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
                placeholderTextColor={colors.textMuted}
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
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Tracking Number / Link</Text>
              <TextInput
                style={styles.input}
                value={trackingNum}
                onChangeText={setTrackingNum}
                placeholder="e.g. Tracking ID #1823901"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Delivery Instructions / Note</Text>
              <TextInput
                style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
                value={delNote}
                onChangeText={setDelNote}
                placeholder="Specific delivery gate or instructions..."
                placeholderTextColor={colors.textMuted}
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

      {/* Global Action Processing Overlay Modal */}
      <Modal visible={updating || pdfLoading} transparent animationType="fade">
        <View style={styles.loadingOverlayModal}>
          <View style={styles.loadingOverlayBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingOverlayTitle}>
              {pdfLoading
                ? 'Generating PDF Document...'
                : updatingStatusTarget
                ? `Marking Quote as ${updatingStatusTarget}...`
                : 'Processing Update...'}
            </Text>
            <Text style={styles.loadingOverlaySub}>
              {pdfLoading
                ? 'Formatting quote items & generating PDF'
                : 'Syncing inventory records & database'}
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (colors: any, insets: any) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  notFoundText: { fontSize: 18, color: colors.textSecondary },
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
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  deleteBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.statusRejected + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: colors.surface,
    borderRadius: Radius.lg,
    padding: 20,
    borderLeftWidth: 4,
    ...Shadow.sm,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  heroAmount: { fontSize: 24, fontWeight: '800', color: colors.textPrimary },
  heroDate: { fontSize: 13, color: colors.textSecondary, marginBottom: 2 },
  heroExpiry: { fontSize: 13, color: colors.textMuted },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: Radius.md,
    padding: 14,
    ...Shadow.sm,
  },
  clientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientAvatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  clientName: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  clientEmail: { fontSize: 13, color: colors.textSecondary },
  itemsTable: {
    backgroundColor: colors.surface,
    borderRadius: Radius.md,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  tableCell: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, flex: 1 },
  tableRight: { textAlign: 'right' },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    gap: 8,
    alignItems: 'center',
  },
  itemName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  itemUnit: { fontSize: 12, color: colors.textMuted },
  itemDiscount: { fontSize: 11, color: colors.statusAccepted, fontWeight: '600' },
  itemDimensions: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  itemTotal: { fontWeight: '700', color: colors.textPrimary, fontSize: 14 },
  totalsCard: {
    backgroundColor: colors.surface,
    borderRadius: Radius.md,
    padding: 16,
    gap: 10,
    ...Shadow.sm,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { fontSize: 14, color: colors.textSecondary },
  totalValue: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  divider: { height: 1, backgroundColor: colors.divider },
  totalFinalLabel: { fontSize: 17, fontWeight: '800', color: colors.textPrimary },
  totalFinal: { fontSize: 20, fontWeight: '800', color: colors.primary },
  notes: {
    fontSize: 14,
    color: colors.textSecondary,
    backgroundColor: colors.surface,
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
    color: colors.primary,
  },
  infoCard: {
    backgroundColor: colors.surface,
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
    color: colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  infoDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: 12,
  },

  // Modal styling
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
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  modalContent: { padding: 20, gap: 16, paddingBottom: 60 },
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
  chipsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: Radius.full,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  presets: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  presetBtn: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  presetText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  barcodeWrapper: {
    marginTop: 16,
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  barcodeLines: {
    flexDirection: 'row',
    height: 36,
    alignItems: 'stretch',
    marginBottom: 4,
  },
  barcodeBar: {
    height: '100%',
  },
  barcodeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 2,
  },
  loadingOverlayModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingOverlayBox: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.surface,
    borderRadius: Radius.lg,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    ...Shadow.lg,
  },
  loadingOverlayTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  loadingOverlaySub: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  deletingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.72)',
    zIndex: 999,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  deletingText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 22,
  },
});
