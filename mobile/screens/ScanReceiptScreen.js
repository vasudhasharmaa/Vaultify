import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { post } from '../api';

const ScanReceiptScreen = ({ route, navigation }) => {
  const { user, token } = route.params || {};
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);

  const requestPermissions = async () => {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    const galleryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!cameraPermission.granted || !galleryPermission.granted) {
      Alert.alert(
        'Permissions needed',
        'Vaultify needs camera and library permissions to scan physical receipts.'
      );
      return false;
    }
    return true;
  };

  const processOcr = async (base64Image) => {
    setLoading(true);
    setStatusMessage('Uploading receipt to Vaultify...');
    try {
      // Simulate steps for smooth UI feel
      setTimeout(() => setStatusMessage('Gemini AI analyzing text...'), 1000);
      setTimeout(() => setStatusMessage('Auto-detecting warranty terms...'), 2000);

      const response = await post(
        '/api/products/ocr',
        { receiptImage: `data:image/jpeg;base64,${base64Image}` },
        token
      );

      const { data } = response.data;
      setLoading(false);
      // Navigate to product verification form
      navigation.navigate('ProductVerification', {
        extractedData: data,
        receiptImage: `data:image/jpeg;base64,${base64Image}`,
        user,
        token,
      });
    } catch (error) {
      console.error('OCR API error:', error);
      setLoading(false);
      Alert.alert(
        'OCR Error',
        'Could not extract text from this receipt. Please try another image or edit details manually.'
      );
    }
  };

  const handleTakePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setSelectedImage(asset.uri);
        processOcr(asset.base64);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Camera Error', 'Could not open camera.');
    }
  };

  const handlePickGallery = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setSelectedImage(asset.uri);
        processOcr(asset.base64);
      }
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert('Gallery Error', 'Could not open image library.');
    }
  };

  // Pre-configured mock triggers for fast offline/emulator testing
  const handleSelectDemoReceipt = async (receiptType) => {
    setLoading(true);
    setStatusMessage('Simulating receipt upload...');
    
    // Simulate API request to fallback parser
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      const response = await post('/api/products/ocr', { receiptImage: 'MOCK_IMAGE_DATA' }, token);
      let data = response.data.data;

      // Adjust sample names based on selected type
      if (receiptType === 'apple') {
        data = {
          name: 'Apple iPhone 15 Pro Max',
          category: 'Electronics',
          price: 139900,
          purchaseDate: new Date().toISOString().split('T')[0],
          purchaseLocation: 'Apple Store BKC, Mumbai',
          totalWarranties: 12,
        };
      } else if (receiptType === 'samsung') {
        data = {
          name: 'Samsung Frame 55" 4K Smart TV',
          category: 'Electronics',
          price: 89900,
          purchaseDate: new Date().toISOString().split('T')[0],
          purchaseLocation: 'Samsung Smart Plaza',
          totalWarranties: 24,
        };
      } else if (receiptType === 'chair') {
        data = {
          name: 'Sleepwell Ortho Mattress',
          category: 'Furniture',
          price: 28500,
          purchaseDate: new Date().toISOString().split('T')[0],
          purchaseLocation: 'Sleepwell Gallery',
          totalWarranties: 60,
        };
      }

      setLoading(false);
      navigation.navigate('ProductVerification', {
        extractedData: data,
        receiptImage: 'MOCK_DEMO_RECEIPT_URI',
        user,
        token,
      });
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', 'Demo OCR simulation failed.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2f80ed" />
        <Text style={styles.loadingText}>{statusMessage}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.heading}>Secure OCR Scanner</Text>
        <Text style={styles.description}>
          Upload a receipt image and Vaultify's integrated AI will automatically catalog your purchase price, warranty details, and location.
        </Text>

        <View style={styles.uploadOptions}>
          <TouchableOpacity style={styles.optionCard} onPress={handleTakePhoto}>
            <Ionicons name="camera" size={40} color="#2f80ed" />
            <Text style={styles.optionTitle}>Use Camera</Text>
            <Text style={styles.optionSub}>Take a photo of physical invoice</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionCard} onPress={handlePickGallery}>
            <Ionicons name="images" size={40} color="#2f80ed" />
            <Text style={styles.optionTitle}>From Gallery</Text>
            <Text style={styles.optionSub}>Choose screenshot or PDF image</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR TEST WITH SAMPLE RECEIPTS</Text>
          <View style={styles.dividerLine} />
        </View>

        <Text style={styles.sectionTitle}>Quick Sandbox Presets</Text>
        <Text style={styles.sectionSub}>Perfect for emulators. Instantly parses preset mock invoices:</Text>

        <View style={styles.presetList}>
          <TouchableOpacity
            style={styles.presetItem}
            onPress={() => handleSelectDemoReceipt('apple')}
          >
            <View style={styles.presetIconContainer}>
              <Ionicons name="logo-apple" size={24} color="#333" />
            </View>
            <View style={styles.presetInfo}>
              <Text style={styles.presetName}>Apple Store Mumbai Invoice</Text>
              <Text style={styles.presetMeta}>Electronics • ₹1,39,900 • 1 Yr Warranty</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#bdc3c7" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.presetItem}
            onPress={() => handleSelectDemoReceipt('samsung')}
          >
            <View style={[styles.presetIconContainer, { backgroundColor: '#e8f0fe' }]}>
              <Ionicons name="tv-outline" size={24} color="#2f80ed" />
            </View>
            <View style={styles.presetInfo}>
              <Text style={styles.presetName}>Samsung Smart TV Receipt</Text>
              <Text style={styles.presetMeta}>Electronics • ₹89,900 • 2 Yrs Warranty</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#bdc3c7" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.presetItem}
            onPress={() => handleSelectDemoReceipt('chair')}
          >
            <View style={[styles.presetIconContainer, { backgroundColor: '#eafaf1' }]}>
              <Ionicons name="bed-outline" size={24} color="#27ae60" />
            </View>
            <View style={styles.presetInfo}>
              <Text style={styles.presetName}>Sleepwell Mattress Receipt</Text>
              <Text style={styles.presetMeta}>Furniture • ₹28,500 • 5 Yrs Warranty</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#bdc3c7" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#64748b',
    fontWeight: '600',
  },
  heading: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 32,
  },
  uploadOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  optionCard: {
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    width: '48%',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 12,
  },
  optionSub: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#cbd5e1',
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    marginHorizontal: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  sectionSub: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
    marginBottom: 16,
  },
  presetList: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderColor: '#e2e8f0',
    borderWidth: 1,
    overflow: 'hidden',
  },
  presetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  presetIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  presetInfo: {
    flex: 1,
  },
  presetName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  presetMeta: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
});

export default ScanReceiptScreen;
