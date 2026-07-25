import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { get, post } from '../api';

const TransferRequestsScreen = ({ route, navigation }) => {
  const { user, token } = route.params || {};
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPendingTransfers = async () => {
    try {
      const res = await get('/api/transfers/pending', token);
      setTransfers(res.data);
    } catch (error) {
      console.error('Error fetching transfers:', error);
      Alert.alert('Connection issue', 'Could not fetch transfer requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingTransfers();
  }, []);

  const handleResponse = async (transfer, action) => {
    const isShare = transfer.type === 'share';
    const actionText = action === 'accept'
      ? (isShare ? 'accept shared access to' : 'accept ownership of')
      : 'decline';
    Alert.alert(
      'Confirm Action',
      `Are you sure you want to ${actionText} this product?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'accept' ? 'Accept' : 'Decline',
          style: action === 'accept' ? 'default' : 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const res = await post(`/api/transfers/${transfer._id}/respond`, { action }, token);
              Alert.alert('Processed', res.data.message);
              fetchPendingTransfers();
            } catch (error) {
              const msg = error.response?.data?.message || 'Error updating transfer.';
              Alert.alert('Error', msg);
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const renderTransferItem = ({ item }) => {
    const isShare = item.type === 'share';
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, isShare && { backgroundColor: '#fef5ec' }]}>
            <MaterialCommunityIcons 
              name={isShare ? "share-variant" : "passport"} 
              size={24} 
              color={isShare ? "#f2994a" : "#2f80ed"} 
            />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.productName}>{item.product?.name || 'Unknown Product'}</Text>
            <Text style={styles.category}>
              {item.product?.category || 'General'} {isShare && '• Shared Access'}
            </Text>
          </View>
        </View>

        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>{isShare ? "Share Details:" : "Transfer Details:"}</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{isShare ? "Sender:" : "Seller:"}</Text>
            <Text style={styles.detailVal}>
              {item.sender?.name} ({item.sender?.email})
            </Text>
          </View>
          
          {!isShare ? (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Years Owned:</Text>
                <Text style={styles.detailVal}>{item.yearsOwned} Years</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Repairs Completed:</Text>
                <Text style={styles.detailVal}>{item.repairsCount} Repairs</Text>
              </View>
              {item.partsReplaced ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Parts Replaced:</Text>
                  <Text style={styles.detailVal}>{item.partsReplaced}</Text>
                </View>
              ) : null}
              {item.notes ? (
                <View style={styles.notesContainer}>
                  <Text style={styles.notesLabel}>Seller Disclosures:</Text>
                  <Text style={styles.notesText}>{item.notes}</Text>
                </View>
              ) : null}
            </>
          ) : (
            <View style={styles.notesContainer}>
              <Text style={styles.notesLabel}>Info:</Text>
              <Text style={styles.notesText}>
                Accepting this request lets you view this product passport, track its warranty claims, and log new repairs. The sender remains the owner.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.declineButton]}
            onPress={() => handleResponse(item, 'reject')}
          >
            <Ionicons name="close-circle-outline" size={16} color="#eb5757" />
            <Text style={styles.declineText}>Decline</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.acceptButton, isShare && { backgroundColor: '#f2994a' }]}
            onPress={() => handleResponse(item, 'accept')}
          >
            <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
            <Text style={styles.acceptText}>{isShare ? "Accept Share" : "Accept Passport"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2f80ed" />
        <Text style={styles.loadingText}>Verifying pending transfers...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.titleSection}>
        <Text style={styles.title}>Pending Digital Passports</Text>
        <Text style={styles.subtitle}>
          Incoming ownership transfers sent to your email. Verify the repair logs before accepting.
        </Text>
      </View>

      {transfers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="mail-open-outline" size={48} color="#bdc3c7" />
          <Text style={styles.emptyText}>No pending transfers</Text>
          <Text style={styles.emptySubtext}>
            Ownership transfer requests sent by other users to your email will show up here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={transfers}
          keyExtractor={(item) => item._id}
          renderItem={renderTransferItem}
          contentContainerStyle={styles.list}
        />
      )}
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
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  titleSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 12,
    marginBottom: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  category: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  detailsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  detailVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
    maxWidth: '70%',
    textAlign: 'right',
  },
  notesContainer: {
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  declineButton: {
    borderColor: '#fde8e8',
    borderWidth: 1,
    backgroundColor: '#fff',
    marginRight: 10,
  },
  declineText: {
    color: '#eb5757',
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 6,
  },
  acceptButton: {
    backgroundColor: '#2f80ed',
  },
  acceptText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 30,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});

export default TransferRequestsScreen;
