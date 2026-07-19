import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { post } from '../api';

const ProductVerificationScreen = ({ route, navigation }) => {
  const { extractedData, receiptImage, user, token } = route.params || {};
  const [name, setName] = useState(extractedData?.name || '');
  const [price, setPrice] = useState(extractedData?.price?.toString() || '0');
  const [category, setCategory] = useState(extractedData?.category || 'Electronics');
  const [purchaseDate, setPurchaseDate] = useState(
    extractedData?.purchaseDate || new Date().toISOString().split('T')[0]
  );
  const [purchaseLocation, setPurchaseLocation] = useState(
    extractedData?.purchaseLocation || ''
  );
  const [totalWarranties, setTotalWarranties] = useState(
    extractedData?.totalWarranties?.toString() || '12'
  );
  const [loading, setLoading] = useState(false);

  const categories = ['Electronics', 'Appliances', 'Furniture', 'Home', 'Automotive', 'Other'];

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Product name is required.');
      return;
    }
    if (!category.trim()) {
      Alert.alert('Validation Error', 'Product category is required.');
      return;
    }

    setLoading(true);
    try {
      const priceNum = parseFloat(price) || 0;
      const warrantyMonths = parseInt(totalWarranties) || 12;

      // Construct request body
      const payload = {
        name: name.trim(),
        category,
        price: priceNum,
        purchaseDate,
        purchaseLocation: purchaseLocation.trim(),
        totalWarranties: warrantyMonths,
        receiptImage: receiptImage === 'MOCK_DEMO_RECEIPT_URI' ? '' : receiptImage, // avoid uploading placeholder string
      };

      await post('/api/products', payload, token);
      setLoading(false);
      Alert.alert('Success', 'Product added to your digital vault!', [
        { text: 'OK', onPress: () => navigation.navigate('Dashboard', { user, token }) },
      ]);
    } catch (error) {
      console.error('Save product error:', error);
      setLoading(false);
      Alert.alert('Save Failed', 'Could not save the product details to your vault.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Verify Digital Passport</Text>
          <Text style={styles.subtitle}>
            Please review the details extracted from your receipt. Make any corrections needed before saving.
          </Text>
        </View>

        {/* Input Form */}
        <View style={styles.formCard}>
          <Text style={styles.inputLabel}>Product Name</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="cube-outline" size={20} color="#7f8c8d" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Sony WH-1000XM5"
            />
          </View>

          <Text style={styles.inputLabel}>Price (INR)</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="cash-outline" size={20} color="#7f8c8d" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
              placeholder="0.00"
            />
          </View>

          <Text style={styles.inputLabel}>Select Category</Text>
          <View style={styles.categoryGrid}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryChip,
                  category === cat && styles.categoryChipSelected,
                ]}
                onPress={() => setCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    category === cat && styles.categoryChipTextSelected,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.inputLabel}>Purchase Date (YYYY-MM-DD)</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="calendar-outline" size={20} color="#7f8c8d" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              value={purchaseDate}
              onChangeText={setPurchaseDate}
              placeholder="YYYY-MM-DD"
            />
          </View>

          <Text style={styles.inputLabel}>Store / Purchase Location</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="business-outline" size={20} color="#7f8c8d" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              value={purchaseLocation}
              onChangeText={setPurchaseLocation}
              placeholder="e.g. Amazon, Croma Store"
            />
          </View>

          <Text style={styles.inputLabel}>Warranty Period (Months)</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="shield-outline" size={20} color="#7f8c8d" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              value={totalWarranties}
              onChangeText={setTotalWarranties}
              keyboardType="numeric"
              placeholder="e.g. 12"
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Add to Vault</Text>
            </>
          )}
        </TouchableOpacity>
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
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  formCard: {
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.01,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 18,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryChipSelected: {
    backgroundColor: '#2f80ed',
    borderColor: '#2f80ed',
  },
  categoryChipText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  categoryChipTextSelected: {
    color: '#fff',
  },
  saveButton: {
    backgroundColor: '#2f80ed',
    borderRadius: 12,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowColor: '#2f80ed',
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    marginLeft: 8,
  },
});

export default ProductVerificationScreen;
