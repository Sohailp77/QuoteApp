import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useProducts } from '../hooks/useProducts';
import { Colors, Radius, Shadow } from '../theme';
import { Button } from './ui/Button';

interface BarcodeScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  visible,
  onClose,
  onScan,
  title = 'Scan Barcode',
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const { products, fetch } = useProducts();
  const [showSimulator, setShowSimulator] = useState(false);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (visible) {
      fetch();
      setScanned(false);
    }
  }, [visible]);

  const handleBarcodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    setScanned(true);
    onScan(data);
  };

  const handleSimulateScan = (barcode: string) => {
    if (scanned) return;
    setScanned(true);
    onScan(barcode);
  };

  if (!permission) {
    // Camera permissions are still loading
    return null;
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {!permission.granted ? (
          <View style={styles.permissionContainer}>
            <Ionicons name="camera-outline" size={64} color={Colors.textMuted} />
            <Text style={styles.permissionText}>
              We need your permission to show the camera for barcode scanning.
            </Text>
            <Button title="Grant Permission" onPress={requestPermission} />
            <TouchableOpacity
              style={styles.simulatorLink}
              onPress={() => setShowSimulator(true)}
            >
              <Text style={styles.simulatorLinkText}>Or use Simulated Barcode Picker</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.scannerWrapper}>
            {!showSimulator ? (
              <CameraView
                style={StyleSheet.absoluteFillObject}
                onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                barcodeScannerSettings={{
                  barcodeTypes: ['ean13', 'ean8', 'qr', 'code128', 'code39'],
                }}
              >
                <View style={styles.overlay}>
                  <View style={styles.unfocusedContainer} />
                  <View style={styles.middleContainer}>
                    <View style={styles.unfocusedContainer} />
                    <View style={styles.focusedContainer}>
                      <View style={[styles.corner, styles.topLeft]} />
                      <View style={[styles.corner, styles.topRight]} />
                      <View style={[styles.corner, styles.bottomLeft]} />
                      <View style={[styles.corner, styles.bottomRight]} />
                    </View>
                    <View style={styles.unfocusedContainer} />
                  </View>
                  <View style={styles.unfocusedContainer}>
                    <Text style={styles.helperText}>Align barcode inside the box</Text>
                    <TouchableOpacity
                      style={styles.simToggle}
                      onPress={() => setShowSimulator(true)}
                    >
                      <Ionicons name="construct-outline" size={16} color="#fff" />
                      <Text style={styles.simToggleText}>Use Simulator Mode</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </CameraView>
            ) : null}
          </View>
        )}

        {/* Simulator Overlay/Pane */}
        {showSimulator && (
          <View style={styles.simulatorContainer}>
            <View style={styles.simHeader}>
              <Text style={styles.simTitle}>🛠️ Barcode Simulator</Text>
              {permission.granted && (
                <TouchableOpacity
                  style={styles.simClose}
                  onPress={() => setShowSimulator(false)}
                >
                  <Text style={styles.simCloseText}>Switch to Camera</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.simSubtitle}>
              Tap a product below to simulate a successful barcode scan in web/emulator.
            </Text>

            <FlatList
              data={products.filter((p) => p.barcode || p.sku)}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.simList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.simRow}
                  onPress={() => handleSimulateScan(item.barcode || item.sku)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.simProdName}>{item.name}</Text>
                    <Text style={styles.simProdBarcode}>
                      Code: {item.barcode || item.sku} ({item.sku})
                    </Text>
                  </View>
                  <Ionicons name="arrow-forward" size={16} color={Colors.accent} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptySim}>
                  <Text style={styles.emptySimText}>
                    No products found with a Barcode or SKU in active catalog. Please create a product first.
                  </Text>
                </View>
              }
            />
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  closeBtn: { padding: 4 },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    gap: 16,
  },
  permissionText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  simulatorLink: {
    padding: 10,
    marginTop: 12,
  },
  simulatorLinkText: {
    fontSize: 14,
    color: Colors.accent,
    fontWeight: '600',
  },
  scannerWrapper: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  unfocusedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  middleContainer: {
    flexDirection: 'row',
    height: 220,
  },
  focusedContainer: {
    width: 260,
    height: 220,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: Colors.accent,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 10,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 10,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 10,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 10,
  },
  helperText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 20,
    textAlign: 'center',
  },
  simToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.full,
    marginTop: 20,
  },
  simToggleText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  
  // Simulator UI
  simulatorContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 20,
  },
  simHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  simTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  simClose: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radius.sm,
    backgroundColor: Colors.accent + '15',
  },
  simCloseText: {
    fontSize: 12,
    color: Colors.accent,
    fontWeight: '700',
  },
  simSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 16,
  },
  simList: {
    gap: 8,
  },
  simRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: Radius.md,
    ...Shadow.sm,
  },
  simProdName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  simProdBarcode: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  emptySim: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptySimText: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
