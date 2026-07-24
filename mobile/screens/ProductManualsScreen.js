import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { get } from '../api';

const ProductManualsScreen = ({ route, navigation }) => {
  const { user, token, products = [] } = route.params || {};
  const [searchText, setSearchText] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [manualText, setManualText] = useState('');
  const [fetchingManual, setFetchingManual] = useState(false);

  // Filter products based on search
  const filteredProducts = products.filter((p) =>
    p.name?.toLowerCase().includes(searchText.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchText.toLowerCase())
  );

  const fetchProductManual = async (product) => {
    setSelectedProduct(product);
    setFetchingManual(true);
    setManualText('');
    try {
      const response = await get(`/api/products/${product._id}/fetch-manual`, token);
      setManualText(response.data.manual);
    } catch (error) {
      console.error('Fetch manual error:', error);
      Alert.alert('Error', 'Could not retrieve product manual. Please try again.');
      setSelectedProduct(null);
    } finally {
      setFetchingManual(false);
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Electronics':
        return 'phone-portrait-outline';
      case 'Appliances':
        return 'hardware-chip-outline';
      case 'Furniture':
        return 'bed-outline';
      case 'Home':
        return 'home-outline';
      case 'Automotive':
        return 'car-outline';
      default:
        return 'cube-outline';
    }
  };

  // Custom parser to render generated markdown manual beautifully
  const renderMarkdown = (text) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, index) => {
      const trimmed = line.trim();
      if (trimmed === '') return <View key={index} style={{ height: 8 }} />;
      if (trimmed === '---') {
        return <View key={index} style={styles.mdDivider} />;
      }
      if (trimmed.startsWith('# ')) {
        return <Text key={index} style={styles.mdTitle}>{trimmed.substring(2)}</Text>;
      }
      if (trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
        const headerText = trimmed.startsWith('## ') ? trimmed.substring(3) : trimmed.substring(4);
        return <Text key={index} style={styles.mdSectionHeader}>{headerText}</Text>;
      }
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const cleaned = trimmed.substring(2).replace(/\*\*/g, '');
        return (
          <View key={index} style={styles.mdBulletRow}>
            <Text style={styles.mdBullet}>•</Text>
            <Text style={styles.mdBulletText}>{cleaned}</Text>
          </View>
        );
      }
      const numberMatch = trimmed.match(/^(\d+)\.\s(.*)/);
      if (numberMatch) {
        const num = numberMatch[1];
        const rest = numberMatch[2].replace(/\*\*/g, '');
        return (
          <View key={index} style={styles.mdNumberRow}>
            <Text style={styles.mdNumber}>{num}.</Text>
            <Text style={styles.mdNumberText}>{rest}</Text>
          </View>
        );
      }
      const cleanedParagraph = trimmed.replace(/\*\*/g, '');
      return <Text key={index} style={styles.mdParagraph}>{cleanedParagraph}</Text>;
    });
  };

  const renderProductItem = ({ item }) => (
    <TouchableOpacity
      style={styles.productItemCard}
      onPress={() => fetchProductManual(item)}
    >
      <View style={styles.productItemLeft}>
        <View style={styles.categoryIconCircle}>
          <Ionicons name={getCategoryIcon(item.category)} size={22} color="#2f80ed" />
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.productMeta}>{item.category} • {item.purchaseLocation || 'Vault'}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
    </TouchableOpacity>
  );

  if (selectedProduct) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Header toolbar */}
        <View style={styles.readerHeader}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => {
              setSelectedProduct(null);
              setManualText('');
            }}
          >
            <Ionicons name="arrow-back" size={24} color="#0f172a" />
            <Text style={styles.backButtonText}>Vault Manuals</Text>
          </TouchableOpacity>
          <Ionicons name="book-outline" size={24} color="#2f80ed" />
        </View>

        {fetchingManual ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2f80ed" />
            <Text style={styles.loadingHeading}>Fetching digital manual...</Text>
            <Text style={styles.loadingSub}>Gemini AI is analyzing "{selectedProduct.name}" to generate a custom setup and troubleshooting guide.</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.readerScroll} showsVerticalScrollIndicator={false}>
            {renderMarkdown(manualText)}
            
            <TouchableOpacity 
              style={styles.doneReadingButton}
              onPress={() => {
                setSelectedProduct(null);
                setManualText('');
              }}
            >
              <Text style={styles.doneReadingText}>Finish Reading</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchSection}>
        <Text style={styles.screenHeading}>Digital Manuals</Text>
        <Text style={styles.screenSub}>Select any product in your vault to instantly fetch its user guide from Gemini AI.</Text>
        
        <View style={styles.searchBarContainer}>
          <Ionicons name="search" size={20} color="#7f8c8d" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search vault products..."
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText !== '' && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={18} color="#bdc3c7" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* List */}
      <View style={styles.listSection}>
        {filteredProducts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>No matching products</Text>
            <Text style={styles.emptySubtext}>Try adjusting your search text or add products on the dashboard first.</Text>
          </View>
        ) : (
          <FlatList
            data={filteredProducts}
            keyExtractor={(item) => item._id}
            renderItem={renderProductItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  searchSection: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  screenHeading: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  screenSub: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
    marginBottom: 16,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#334155',
  },
  listSection: {
    flex: 1,
  },
  listContent: {
    padding: 20,
    gap: 12,
  },
  productItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  productItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    maxWidth: 240,
  },
  productMeta: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  readerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginLeft: 8,
  },
  readerScroll: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  loadingHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 16,
    textAlign: 'center',
  },
  loadingSub: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 30,
    lineHeight: 18,
  },
  doneReadingButton: {
    backgroundColor: '#2f80ed',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
  },
  doneReadingText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  // Custom Markdown Styles
  mdTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 16,
  },
  mdSectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e3a8a',
    marginTop: 18,
    marginBottom: 8,
  },
  mdParagraph: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
    marginBottom: 12,
  },
  mdDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 16,
  },
  mdBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingLeft: 8,
  },
  mdBullet: {
    fontSize: 14,
    color: '#2f80ed',
    marginRight: 8,
    lineHeight: 20,
  },
  mdBulletText: {
    flex: 1,
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },
  mdNumberRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingLeft: 8,
  },
  mdNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2f80ed',
    marginRight: 8,
    lineHeight: 20,
  },
  mdNumberText: {
    flex: 1,
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },
});

export default ProductManualsScreen;
