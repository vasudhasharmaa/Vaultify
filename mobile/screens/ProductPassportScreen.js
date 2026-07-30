import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  SafeAreaView,
  FlatList,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { get, post } from '../api';

const ProductPassportScreen = ({ route, navigation }) => {
  const { productId, user, token } = route.params || {};
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('warranty'); // 'warranty' | 'repairs' | 'gemini' | 'timeline' | 'actions'

  // Form states for Repair Log Modal
  const [repairModalVisible, setRepairModalVisible] = useState(false);
  const [repairDescription, setRepairDescription] = useState('');
  const [repairParts, setRepairParts] = useState('');
  const [repairCost, setRepairCost] = useState('');
  const [repairNotes, setRepairNotes] = useState('');
  const [repairLoading, setRepairLoading] = useState(false);

  // Form states for Sharing & Transfer
  const [shareEmail, setShareEmail] = useState('');
  const [shareLoading, setShareLoading] = useState(false);
  
  const [transferEmail, setTransferEmail] = useState('');
  const [transferYears, setTransferYears] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);

  // Chat states for Gemini AI
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    {
      id: 'welcome',
      sender: 'ai',
      text: 'Hello! I am your Vaultify Gemini Assistant. Ask me anything about setting up, troubleshooting, or maintaining your product.',
    },
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  const fetchProductDetails = async () => {
    try {
      const res = await get(`/api/products/${productId}`, token);
      setProduct(res.data);
    } catch (error) {
      console.error('Error fetching product passport:', error);
      Alert.alert('Error', 'Could not load product passport details.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductDetails();
  }, [productId]);

  const handleClaimWarranty = async () => {
    if (product.warranty?.expiryDate && new Date(product.warranty.expiryDate) < new Date()) {
      Alert.alert('Claim Blocked', 'This product warranty has already expired.');
      return;
    }

    if (product.warranty.warrantiesRemaining <= 0) {
      Alert.alert('Claim Blocked', 'No warranty claims remaining in this passport.');
      return;
    }

    Alert.alert(
      'Claim Warranty Service',
      `Are you sure you want to log a warranty claim? This will decrement your remaining claims count.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Claim',
          onPress: async () => {
            setLoading(true);
            try {
              const res = await post(`/api/products/${productId}/warranty-use`, { notes: 'Warranty claimed via mobile app' }, token);
              setProduct(res.data);
              Alert.alert('Claim Logged', 'Your warranty claim has been successfully updated on the timeline.');
            } catch (error) {
              const msg = error.response?.data?.message || 'Could not claim warranty.';
              Alert.alert('Error', msg);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleAddRepair = async () => {
    if (!repairDescription.trim()) {
      Alert.alert('Validation Error', 'Repair description is required.');
      return;
    }

    setRepairLoading(true);
    try {
      const payload = {
        description: repairDescription.trim(),
        partsChanged: repairParts.trim(),
        cost: parseFloat(repairCost) || 0,
        notes: repairNotes.trim(),
      };

      const res = await post(`/api/products/${productId}/repairs`, payload, token);
      setProduct(res.data);
      setRepairModalVisible(false);
      
      // Reset form
      setRepairDescription('');
      setRepairParts('');
      setRepairCost('');
      setRepairNotes('');
      
      Alert.alert('Success', 'Repair history logged successfully.');
    } catch (error) {
      Alert.alert('Error', 'Could not save repair details.');
    } finally {
      setRepairLoading(false);
    }
  };

  const handleShareAccess = async () => {
    if (!shareEmail.trim()) {
      Alert.alert('Validation Error', 'Family member email is required.');
      return;
    }

    setShareLoading(true);
    try {
      const res = await post(`/api/products/${productId}/share`, { email: shareEmail.trim() }, token);
      setProduct(res.data.product);
      setShareEmail('');
      Alert.alert('Shared Access', res.data.message);
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to share product.';
      Alert.alert('Error', msg);
    } finally {
      setShareLoading(false);
    }
  };

  const handleRevokeShare = async (sharedUserId, sharedName) => {
    Alert.alert(
      'Revoke Access',
      `Are you sure you want to stop sharing access with ${sharedName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const res = await post(`/api/products/${productId}/unshare`, { userId: sharedUserId }, token);
              setProduct(res.data.product);
              Alert.alert('Revoked', 'Shared access has been removed.');
            } catch (error) {
              Alert.alert('Error', 'Failed to revoke sharing.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleTransferOwnership = async () => {
    if (!transferEmail.trim()) {
      Alert.alert('Validation Error', 'Buyer email address is required.');
      return;
    }

    Alert.alert(
      'Confirm Transfer',
      `WARNING: This will permanently transfer product ownership to ${transferEmail}. Once they accept, you will lose access to modify this passport. Proceed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Transfer',
          onPress: async () => {
            setTransferLoading(true);
            try {
              const payload = {
                productId,
                recipientEmail: transferEmail.trim().toLowerCase(),
                yearsOwned: parseInt(transferYears) || 0,
                repairsCount: product.repairs?.length || 0,
                partsReplaced: product.repairs?.map((r) => r.partsChanged).filter(Boolean).join(', ') || 'None',
                notes: transferNotes.trim(),
              };

              await post('/api/transfers', payload, token);
              setTransferEmail('');
              setTransferYears('');
              setTransferNotes('');
              
              Alert.alert('Request Sent', 'Ownership transfer request has been successfully sent to the buyer.', [
                { text: 'Go Back', onPress: () => navigation.navigate('Dashboard', { user, token }) },
              ]);
            } catch (error) {
              const msg = error.response?.data?.message || 'Transfer failed.';
              Alert.alert('Error', msg);
            } finally {
              setTransferLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleAskGemini = async () => {
    if (!chatInput.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: chatInput.trim(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    const question = chatInput.trim();
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await post(`/api/products/${productId}/ask-manual`, { question }, token);
      const aiReply = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: res.data.reply,
      };
      setChatMessages((prev) => [...prev, aiReply]);
    } catch (error) {
      const errorReply = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: 'Sorry, I am having trouble connecting to Gemini API right now. Please check your network and try again.',
      };
      setChatMessages((prev) => [...prev, errorReply]);
    } finally {
      setChatLoading(false);
    }
  };

  const formatRupee = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading || !product) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2f80ed" />
        <Text style={styles.loadingText}>Fetching Product Passport...</Text>
      </View>
    );
  }

  const isOwner = product.owner?._id === user?.id || product.owner === user?.id;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Info */}
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View style={styles.categoryTag}>
            <Text style={styles.categoryTagText}>{product.category}</Text>
          </View>
          <Text style={styles.headerPrice}>{formatRupee(product.price)}</Text>
        </View>
        <Text style={styles.productTitle}>{product.name}</Text>
        <Text style={styles.purchaseSub}>
          Bought from {product.purchaseLocation || 'Unknown Store'} on {new Date(product.purchaseDate).toLocaleDateString()}
        </Text>
      </View>

      {/* Tab Selectors */}
      <View style={styles.subTabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.subTab, activeSubTab === 'warranty' && styles.subTabActive]}
            onPress={() => setActiveSubTab('warranty')}
          >
            <Text style={[styles.subTabText, activeSubTab === 'warranty' && styles.subTabTextActive]}>Warranty</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.subTab, activeSubTab === 'repairs' && styles.subTabActive]}
            onPress={() => setActiveSubTab('repairs')}
          >
            <Text style={[styles.subTabText, activeSubTab === 'repairs' && styles.subTabTextActive]}>Repairs</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.subTab, activeSubTab === 'gemini' && styles.subTabActive]}
            onPress={() => setActiveSubTab('gemini')}
          >
            <Text style={[styles.subTabText, activeSubTab === 'gemini' && styles.subTabTextActive]}>Gemini AI</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.subTab, activeSubTab === 'timeline' && styles.subTabActive]}
            onPress={() => setActiveSubTab('timeline')}
          >
            <Text style={[styles.subTabText, activeSubTab === 'timeline' && styles.subTabTextActive]}>Timeline</Text>
          </TouchableOpacity>

          {isOwner && (
            <TouchableOpacity
              style={[styles.subTab, activeSubTab === 'actions' && styles.subTabActive]}
              onPress={() => setActiveSubTab('actions')}
            >
              <Text style={[styles.subTabText, activeSubTab === 'actions' && styles.subTabTextActive]}>Manage</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* Sub-tab Contents */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {activeSubTab === 'warranty' && (
            <View style={styles.tabContent}>
              <View style={styles.card}>
                <Text style={styles.cardHeader}>Warranty Status</Text>
                
                <View style={styles.warrantyGrid}>
                  <View style={styles.warrantyGridItem}>
                    <Text style={styles.gridLabel}>Total Warranties</Text>
                    <Text style={styles.gridValue}>{product.warranty.totalWarranties} Claims</Text>
                  </View>
                  <View style={styles.warrantyGridItem}>
                    <Text style={styles.gridLabel}>Used Claims</Text>
                    <Text style={[styles.gridValue, { color: '#eb5757' }]}>{product.warranty.warrantiesUsed} Claims</Text>
                  </View>
                  <View style={styles.warrantyGridItem}>
                    <Text style={styles.gridLabel}>Remaining Claims</Text>
                    <Text style={[styles.gridValue, { color: '#27ae60' }]}>{product.warranty.warrantiesRemaining} Claims</Text>
                  </View>
                </View>

                <View style={styles.dateMeta}>
                  <View style={styles.dateMetaRow}>
                    <Text style={styles.dateMetaLabel}>Start Date:</Text>
                    <Text style={styles.dateMetaValue}>{new Date(product.warranty.startDate).toLocaleDateString()}</Text>
                  </View>
                  <View style={styles.dateMetaRow}>
                    <Text style={styles.dateMetaLabel}>Expiry Date:</Text>
                    <Text style={styles.dateMetaValue}>{new Date(product.warranty.expiryDate).toLocaleDateString()}</Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.primaryButton} onPress={handleClaimWarranty}>
                  <Ionicons name="shield-checkmark" size={18} color="#fff" />
                  <Text style={styles.primaryButtonText}>Claim Warranty Service</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {activeSubTab === 'repairs' && (
            <View style={styles.tabContent}>
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardHeader}>Repairs Log</Text>
                  <TouchableOpacity style={styles.headerButton} onPress={() => setRepairModalVisible(true)}>
                    <Ionicons name="add" size={16} color="#2f80ed" />
                    <Text style={styles.headerButtonText}>Record Repair</Text>
                  </TouchableOpacity>
                </View>

                {product.repairs?.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Ionicons name="construct-outline" size={32} color="#94a3b8" />
                    <Text style={styles.emptyCardText}>No repairs recorded yet</Text>
                  </View>
                ) : (
                  product.repairs.map((repair, index) => (
                    <View key={repair._id || index} style={styles.repairItem}>
                      <View style={styles.repairRow}>
                        <Text style={styles.repairTitle}>{repair.description}</Text>
                        <Text style={styles.repairCost}>{formatRupee(repair.cost)}</Text>
                      </View>
                      <Text style={styles.repairDate}>Logged on {new Date(repair.repairDate).toLocaleDateString()}</Text>
                      {repair.partsChanged ? (
                        <Text style={styles.repairParts}>Parts replaced: {repair.partsChanged}</Text>
                      ) : null}
                      {repair.notes ? <Text style={styles.repairNotes}>Notes: {repair.notes}</Text> : null}
                    </View>
                  ))
                )}
              </View>
            </View>
          )}

          {activeSubTab === 'gemini' && (
            <View style={[styles.tabContent, { flex: 1 }]}>
              <View style={styles.chatCard}>
                <ScrollView 
                  style={styles.chatScroll}
                  contentContainerStyle={{ paddingVertical: 10 }}
                  ref={(ref) => { this.chatScrollView = ref; }}
                  onContentSizeChange={() => this.chatScrollView?.scrollToEnd({ animated: true })}
                >
                  {chatMessages.map((msg) => (
                    <View
                      key={msg.id}
                      style={[
                        styles.chatBubble,
                        msg.sender === 'user' ? styles.chatBubbleUser : styles.chatBubbleAi,
                      ]}
                    >
                      <Text style={msg.sender === 'user' ? styles.chatTextUser : styles.chatTextAi}>
                        {msg.text}
                      </Text>
                    </View>
                  ))}
                  {chatLoading && (
                    <View style={[styles.chatBubble, styles.chatBubbleAi, styles.chatBubbleLoading]}>
                      <ActivityIndicator size="small" color="#2f80ed" />
                    </View>
                  )}
                </ScrollView>

                <View style={styles.chatInputRow}>
                  <TextInput
                    style={styles.chatTextInput}
                    placeholder="Ask about error codes, setup guide..."
                    value={chatInput}
                    onChangeText={setChatInput}
                    onSubmitEditing={handleAskGemini}
                  />
                  <TouchableOpacity style={styles.chatSendButton} onPress={handleAskGemini}>
                    <Ionicons name="send" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {activeSubTab === 'timeline' && (
            <View style={styles.tabContent}>
              <View style={styles.card}>
                <Text style={styles.cardHeader}>Product Lifecycle Timeline</Text>
                
                <View style={styles.timelineContainer}>
                  {product.timeline?.map((event, index) => (
                    <View key={event._id || index} style={styles.timelineNode}>
                      <View style={styles.timelineLineContainer}>
                        <View style={styles.timelineDot} />
                        {index < product.timeline.length - 1 && <View style={styles.timelineVerticalLine} />}
                      </View>
                      
                      <View style={styles.timelineDetails}>
                        <Text style={styles.timelineEventTitle}>{event.event}</Text>
                        <Text style={styles.timelineEventDate}>
                          {new Date(event.date).toLocaleDateString()}
                        </Text>
                        <Text style={styles.timelineEventDesc}>{event.description}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {activeSubTab === 'actions' && isOwner && (
            <View style={styles.tabContent}>
              {/* Family Sharing Section */}
              <View style={styles.card}>
                <Text style={styles.cardHeader}>Family Warranty Sharing</Text>
                <Text style={styles.fieldDesc}>
                  Share this product passport with your family members so they can track warranties and log repairs too.
                </Text>
                <View style={styles.actionRow}>
                  <TextInput
                    style={[styles.chatTextInput, { backgroundColor: '#f1f5f9' }]}
                    placeholder="Enter family member email"
                    value={shareEmail}
                    onChangeText={setShareEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <TouchableOpacity 
                    style={[styles.chatSendButton, { borderRadius: 10 }]} 
                    onPress={handleShareAccess}
                    disabled={shareLoading}
                  >
                    {shareLoading ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="person-add" size={18} color="#fff" />}
                  </TouchableOpacity>
                </View>

                {/* List Shared Users */}
                <Text style={styles.subCardHeader}>People with access:</Text>
                {product.sharedWith?.length === 0 ? (
                  <Text style={styles.noShareText}>Not shared with any family members yet.</Text>
                ) : (
                  product.sharedWith.map((sharedUser) => (
                    <View key={sharedUser._id} style={styles.sharedUserRow}>
                      <View>
                        <Text style={styles.sharedUserName}>{sharedUser.name}</Text>
                        <Text style={styles.sharedUserEmail}>{sharedUser.email}</Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.revokeButton}
                        onPress={() => handleRevokeShare(sharedUser._id, sharedUser.name)}
                      >
                        <Text style={styles.revokeButtonText}>Revoke</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>

              {/* Ownership Transfer Section */}
              <View style={styles.card}>
                <Text style={[styles.cardHeader, { color: '#eb5757' }]}>Digital Ownership Transfer</Text>
                <Text style={styles.fieldDesc}>
                  Permanently transfer the digital product passport to a buyer. Once they accept, this passport will move to their vault, certifying complete product and repair history.
                </Text>

                <TextInput
                  style={styles.inputField}
                  placeholder="Buyer's registered email address"
                  value={transferEmail}
                  onChangeText={setTransferEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <TextInput
                  style={styles.inputField}
                  placeholder="Number of years you owned the product"
                  value={transferYears}
                  onChangeText={setTransferYears}
                  keyboardType="numeric"
                />

                <TextInput
                  style={[styles.inputField, { height: 60, paddingTop: 10 }]}
                  placeholder="Additional transfer notes (e.g. current condition)"
                  value={transferNotes}
                  onChangeText={setTransferNotes}
                  multiline
                />

                <TouchableOpacity 
                  style={styles.dangerButton}
                  onPress={handleTransferOwnership}
                  disabled={transferLoading}
                >
                  {transferLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="transfer" size={20} color="#fff" />
                      <Text style={styles.dangerButtonText}>Request Transfer</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Record Repair Modal */}
      <Modal visible={repairModalVisible} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Record Repair</Text>
              <TouchableOpacity onPress={() => setRepairModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Repair description (e.g. Screen replacement)"
              value={repairDescription}
              onChangeText={setRepairDescription}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Parts changed (e.g. OLED Display Panel)"
              value={repairParts}
              onChangeText={setRepairParts}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Cost in INR"
              value={repairCost}
              onChangeText={setRepairCost}
              keyboardType="numeric"
            />

            <TextInput
              style={[styles.modalInput, { height: 60, paddingTop: 10 }]}
              placeholder="Repair Notes"
              value={repairNotes}
              onChangeText={setRepairNotes}
              multiline
            />

            <TouchableOpacity 
              style={styles.modalSaveButton}
              onPress={handleAddRepair}
              disabled={repairLoading}
            >
              {repairLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalSaveText}>Save Repair</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    fontSize: 15,
    color: '#64748b',
    fontWeight: '600',
  },
  headerCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryTag: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryTagText: {
    color: '#2f80ed',
    fontSize: 11,
    fontWeight: '700',
  },
  headerPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  productTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  purchaseSub: {
    fontSize: 12,
    color: '#64748b',
  },
  subTabContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingHorizontal: 20,
  },
  subTab: {
    paddingVertical: 14,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  subTabActive: {
    borderBottomColor: '#2f80ed',
  },
  subTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  subTabTextActive: {
    color: '#2f80ed',
  },
  scrollContent: {
    padding: 20,
  },
  tabContent: {
    flex: 1,
  },
  card: {
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.01,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f7ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  headerButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2f80ed',
    marginLeft: 4,
  },
  warrantyGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  warrantyGridItem: {
    alignItems: 'center',
    flex: 1,
  },
  gridLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 4,
  },
  gridValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  dateMeta: {
    marginBottom: 20,
  },
  dateMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dateMetaLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  dateMetaValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  primaryButton: {
    backgroundColor: '#2f80ed',
    borderRadius: 12,
    height: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  emptyCardText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },
  repairItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 12,
  },
  repairRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  repairTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  repairCost: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  repairDate: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  repairParts: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  repairNotes: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 2,
  },
  chatCard: {
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 16,
    height: 400,
    overflow: 'hidden',
  },
  chatScroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  chatBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  chatBubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: '#2f80ed',
  },
  chatBubbleAi: {
    alignSelf: 'flex-start',
    backgroundColor: '#f1f5f9',
  },
  chatBubbleLoading: {
    width: 60,
    alignItems: 'center',
  },
  chatTextUser: {
    color: '#fff',
    fontSize: 14,
  },
  chatTextAi: {
    color: '#0f172a',
    fontSize: 14,
  },
  chatInputRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    padding: 12,
    alignItems: 'center',
  },
  chatTextInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 40,
    marginRight: 10,
    fontSize: 14,
  },
  chatSendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2f80ed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineContainer: {
    paddingLeft: 10,
  },
  timelineNode: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  timelineLineContainer: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2f80ed',
  },
  timelineVerticalLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#cbd5e1',
    marginTop: 4,
  },
  timelineDetails: {
    flex: 1,
  },
  timelineEventTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  timelineEventDate: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  timelineEventDesc: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  fieldDesc: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 12,
    lineHeight: 16,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  subCardHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginTop: 10,
    marginBottom: 8,
  },
  noShareText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  sharedUserRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
  },
  sharedUserName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  sharedUserEmail: {
    fontSize: 11,
    color: '#64748b',
  },
  revokeButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  revokeButtonText: {
    color: '#eb5757',
    fontSize: 12,
    fontWeight: '600',
  },
  inputField: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
    fontSize: 13,
  },
  dangerButton: {
    backgroundColor: '#eb5757',
    borderRadius: 10,
    height: 44,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  dangerButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 14,
  },
  modalSaveButton: {
    backgroundColor: '#2f80ed',
    borderRadius: 10,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  modalSaveText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});

export default ProductPassportScreen;
