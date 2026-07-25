import React, { useState, useEffect } from 'react';
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
  RefreshControl,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { get } from '../api';

const DashboardScreen = ({ route, navigation }) => {
  const { user, token } = route.params || {};
  const [products, setProducts] = useState([]);
  const [pendingTransfersCount, setPendingTransfersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeTab, setActiveTab] = useState('owned'); // 'owned' | 'shared'

  const categories = ['All', 'Electronics', 'Appliances', 'Furniture', 'Home', 'Automotive', 'Other'];

  const fetchDashboardData = async () => {
    try {
      // Fetch products
      const productsRes = await get('/api/products', token);
      setProducts(productsRes.data);

      // Fetch pending transfers count
      const transfersRes = await get('/api/transfers/pending', token);
      setPendingTransfersCount(transfersRes.data.length);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      Alert.alert('Connection issue', 'Could not refresh data. Check if backend is running.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Re-fetch when screen is focused (e.g. after adding a product)
    const unsubscribe = navigation.addListener('focus', () => {
      fetchDashboardData();
    });
    return unsubscribe;
  }, [navigation]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  // Safeguard: ensure products is always an array
  const productsList = Array.isArray(products) ? products : [];

  // Math stats calculation
  const ownedProducts = productsList.filter((p) => p.owner?._id === user?.id || p.owner === user?.id);
  const sharedProducts = productsList.filter((p) => p.owner?._id !== user?.id && p.owner !== user?.id);

  const displayedProducts = (activeTab === 'owned' ? ownedProducts : sharedProducts).filter((p) => {
    const matchesSearch = p.name?.toLowerCase().includes(searchText.toLowerCase()) || 
                          p.purchaseLocation?.toLowerCase().includes(searchText.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalValue = productsList.reduce((sum, p) => sum + (p.price || 0), 0);

  const activeWarranties = productsList.filter((p) => {
    if (!p.warranty?.expiryDate) return false;
    return new Date(p.warranty.expiryDate) > new Date();
  }).length;

  const upcomingExpiries = productsList.filter((p) => {
    if (!p.warranty?.expiryDate) return false;
    const exp = new Date(p.warranty.expiryDate);
    const diffTime = exp - new Date();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 30; // within 30 days
  }).length;

  const manualsNeverOpenedCount = productsList.filter((p) => p.manual?.neverOpened).length;

  const formatRupee = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getWarrantyRemainingText = (expiryDate) => {
    if (!expiryDate) return 'No warranty';
    const exp = new Date(expiryDate);
    const today = new Date();
    if (exp < today) return 'Expired';
    const diffTime = exp - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 30) {
      const months = Math.floor(diffDays / 30);
      return `${months} mo left`;
    }
    return `${diffDays} days left`;
  };

  const getWarrantyProgress = (startDate, expiryDate) => {
    if (!startDate || !expiryDate) return 0;
    const start = new Date(startDate);
    const exp = new Date(expiryDate);
    const today = new Date();
    if (exp < today) return 0;
    if (today < start) return 1;
    
    const total = exp - start;
    const elapsed = today - start;
    const progress = 1 - elapsed / total;
    return Math.max(0, Math.min(1, progress));
  };

  const renderProductItem = ({ item }) => {
    const remainingText = getWarrantyRemainingText(item.warranty?.expiryDate);
    const progress = getWarrantyProgress(item.warranty?.startDate, item.warranty?.expiryDate);
    const isExpired = remainingText === 'Expired';
    const isClose = remainingText.includes('days');

    let progressColor = '#27ae60'; // green
    if (isExpired) progressColor = '#eb5757'; // red
    else if (isClose) progressColor = '#f2994a'; // orange

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => navigation.navigate('ProductPassport', { productId: item._id, user, token })}
      >
        <View style={styles.productHeader}>
          <View>
            <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.productSub}>{item.category} • {item.purchaseLocation || 'Unknown Store'}</Text>
          </View>
          <Text style={styles.productPrice}>{formatRupee(item.price)}</Text>
        </View>

        <View style={styles.warrantySection}>
          <View style={styles.warrantyMeta}>
            <Text style={styles.warrantyLabel}>Warranty Tracker</Text>
            <Text style={[styles.warrantyValue, { color: progressColor }]}>{remainingText}</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progress * 100}%`, backgroundColor: progressColor }]} />
          </View>
        </View>

        {item.sharedWith?.length > 0 && item.owner?._id === user?.id && (
          <View style={styles.sharedBadge}>
            <Ionicons name="people-outline" size={14} color="#7f8c8d" />
            <Text style={styles.sharedBadgeText}>Shared with {item.sharedWith.length} family member(s)</Text>
          </View>
        )}
        {item.owner?._id !== user?.id && item.owner?.name && (
          <View style={styles.sharedBadge}>
            <Ionicons name="person-outline" size={14} color="#2f80ed" />
            <Text style={[styles.sharedBadgeText, { color: '#2f80ed' }]}>Owned by {item.owner.name}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2f80ed" />
        <Text style={styles.loadingText}>Loading your vault...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Hello,</Text>
          <Text style={styles.userText}>{user?.name || 'Vaultify User'}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.badgeIconButton}
            onPress={() => navigation.navigate('TransferRequests', { user, token })}
          >
            <MaterialCommunityIcons name="transfer" size={24} color="#2f80ed" />
            {pendingTransfersCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingTransfersCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('UserProfile', { user, token, products })}>
            <Ionicons name="person-circle-outline" size={32} color="#4f5d75" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Statistics Board */}
        <View style={styles.statsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
            <View style={[styles.statCard, { backgroundColor: '#2f80ed' }]}>
              <Ionicons name="wallet-outline" size={24} color="#fff" />
              <Text style={styles.statLabelLight}>Total Net Value</Text>
              <Text style={styles.statValueLight}>{formatRupee(totalValue)}</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="cube-outline" size={24} color="#2f80ed" />
              <Text style={styles.statLabel}>Total Products</Text>
              <Text style={styles.statValue}>{products.length}</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="shield-checkmark-outline" size={24} color="#27ae60" />
              <Text style={styles.statLabel}>Active Warranties</Text>
              <Text style={styles.statValue}>{activeWarranties}</Text>
            </View>

            {upcomingExpiries > 0 && (
              <View style={[styles.statCard, { borderColor: '#f2994a', borderWidth: 1 }]}>
                <Ionicons name="time-outline" size={24} color="#f2994a" />
                <Text style={styles.statLabel}>Expiring Soon</Text>
                <Text style={[styles.statValue, { color: '#f2994a' }]}>{upcomingExpiries}</Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Manuals Banner */}
        {productsList.length > 0 && (
          <TouchableOpacity
            style={styles.manualsBanner}
            onPress={() => navigation.navigate('ProductManuals', { user, token, products: productsList })}
          >
            <View style={styles.manualsBannerLeft}>
              <View style={styles.manualsIconContainer}>
                <Ionicons name="book" size={22} color="#fff" />
              </View>
              <View style={styles.manualsTextContainer}>
                <Text style={styles.manualsBannerTitle}>Digital Product Manuals</Text>
                <Text style={styles.manualsBannerDesc}>
                  Instantly fetch setup & troubleshooting guides for any vault product using Gemini AI.
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#3b82f6" />
          </TouchableOpacity>
        )}

        {/* Action Controls */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('ScanReceipt', { user, token })}
          >
            <Ionicons name="camera" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>Scan Product Receipt</Text>
          </TouchableOpacity>
        </View>

        {/* Search & Tabs */}
        <View style={styles.searchSection}>
          <View style={styles.searchBarContainer}>
            <Ionicons name="search" size={20} color="#7f8c8d" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products, stores..."
              value={searchText}
              onChangeText={setSearchText}
            />
            {searchText !== '' && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <Ionicons name="close-circle" size={18} color="#bdc3c7" />
              </TouchableOpacity>
            )}
          </View>

          {/* Category Filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryChip,
                  selectedCategory === cat && styles.categoryChipSelected,
                ]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    selectedCategory === cat && styles.categoryChipTextSelected,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Ownership Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'owned' && styles.tabActive]}
              onPress={() => setActiveTab('owned')}
            >
              <Text style={[styles.tabText, activeTab === 'owned' && styles.tabTextActive]}>
                My Vault ({ownedProducts.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'shared' && styles.tabActive]}
              onPress={() => setActiveTab('shared')}
            >
              <Text style={[styles.tabText, activeTab === 'shared' && styles.tabTextActive]}>
                Shared with Me ({sharedProducts.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Product Items */}
        <View style={styles.listSection}>
          {displayedProducts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="file-tray-outline" size={48} color="#bdc3c7" />
              <Text style={styles.emptyText}>No products found</Text>
              <Text style={styles.emptySubtext}>
                {searchText || selectedCategory !== 'All'
                  ? 'Try modifying your search queries'
                  : 'Start by scanning your first receipt above!'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={displayedProducts}
              keyExtractor={(item) => item._id}
              renderItem={renderProductItem}
              scrollEnabled={false} // FlatList is inside ScrollView
            />
          )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  welcomeText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  userText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeIconButton: {
    position: 'relative',
    marginRight: 16,
    padding: 4,
  },
  badge: {
    position: 'absolute',
    right: -4,
    top: -4,
    backgroundColor: '#eb5757',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  statsContainer: {
    marginTop: 16,
    paddingLeft: 20,
  },
  statsScroll: {
    paddingRight: 20,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    width: 140,
    marginRight: 12,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 4,
  },
  statLabelLight: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
    fontWeight: '500',
  },
  statValueLight: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginTop: 4,
  },
  manualsBanner: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#3b82f6',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  manualsBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  manualsIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  manualsTextContainer: {
    flex: 1,
  },
  manualsBannerTitle: {
    fontWeight: '800',
    fontSize: 15,
    color: '#1e3a8a',
    marginBottom: 2,
  },
  manualsBannerDesc: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
  },
  quickActions: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  actionButton: {
    backgroundColor: '#2f80ed',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2f80ed',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  searchSection: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: '#334155',
  },
  categoryScroll: {
    marginTop: 12,
    marginBottom: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
  },
  categoryChipSelected: {
    backgroundColor: '#2f80ed',
  },
  categoryChipText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
  categoryChipTextSelected: {
    color: '#fff',
  },
  tabContainer: {
    flexDirection: 'row',
    marginTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#2f80ed',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  tabTextActive: {
    color: '#2f80ed',
  },
  listSection: {
    paddingHorizontal: 20,
    marginTop: 12,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderColor: '#e2e8f0',
    borderWidth: 1,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    maxWidth: 200,
  },
  productSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  warrantySection: {
    marginTop: 14,
  },
  warrantyMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  warrantyLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  warrantyValue: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  sharedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: '#f8fafc',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  sharedBadgeText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
    marginLeft: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
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
    paddingHorizontal: 20,
  },
});

export default DashboardScreen;
