import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const UserProfileScreen = ({ route, navigation }) => {
  const { user, products } = route.params || {};

  const totalValue = products?.reduce((sum, p) => sum + (p.price || 0), 0) || 0;
  const activeWarranties = products?.filter((p) => {
    if (!p.warranty?.expiryDate) return false;
    return new Date(p.warranty.expiryDate) > new Date();
  }).length || 0;

  const formatRupee = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleLogout = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarLetter}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>
          <Text style={styles.userName}>{user?.name || 'Vaultify User'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'Not Available'}</Text>
        </View>

        {/* User Summary Stats */}
        <Text style={styles.sectionHeader}>Vault Summary</Text>
        
        <View style={styles.statsCard}>
          <View style={styles.statRow}>
            <View style={styles.statIconContainer}>
              <Ionicons name="cube-outline" size={20} color="#2f80ed" />
            </View>
            <View style={styles.statDetails}>
              <Text style={styles.statLabel}>Products Cataloged</Text>
              <Text style={styles.statValue}>{products?.length || 0} items</Text>
            </View>
          </View>

          <View style={styles.statRow}>
            <View style={[styles.statIconContainer, { backgroundColor: '#eafaf1' }]}>
              <Ionicons name="cash-outline" size={20} color="#27ae60" />
            </View>
            <View style={styles.statDetails}>
              <Text style={styles.statLabel}>Total Assets Value</Text>
              <Text style={styles.statValue}>{formatRupee(totalValue)}</Text>
            </View>
          </View>

          <View style={styles.statRow}>
            <View style={[styles.statIconContainer, { backgroundColor: '#fef5ec' }]}>
              <Ionicons name="shield-outline" size={20} color="#f2994a" />
            </View>
            <View style={styles.statDetails}>
              <Text style={styles.statLabel}>Active Warranties</Text>
              <Text style={styles.statValue}>{activeWarranties} active</Text>
            </View>
          </View>
        </View>

        {/* Quick Settings Mock */}
        <Text style={styles.sectionHeader}>Application Settings</Text>
        <View style={styles.settingsCard}>
          <TouchableOpacity style={styles.settingsItem}>
            <Ionicons name="notifications-outline" size={20} color="#64748b" />
            <Text style={styles.settingsItemText}>Notification Settings</Text>
            <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsItem}>
            <Ionicons name="shield-half-outline" size={20} color="#64748b" />
            <Text style={styles.settingsItemText}>Privacy & Security</Text>
            <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsItem}>
            <Ionicons name="help-circle-outline" size={20} color="#64748b" />
            <Text style={styles.settingsItemText}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
          </TouchableOpacity>
        </View>

        {/* Action Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color="#fff" />
          <Text style={styles.logoutButtonText}>Log out of Vaultify</Text>
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
    padding: 24,
  },
  profileCard: {
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 28,
    shadowColor: '#000',
    shadowOpacity: 0.01,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  avatarContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarLetter: {
    fontSize: 32,
    fontWeight: '800',
    color: '#2f80ed',
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
    color: '#64748b',
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: 12,
  },
  statsCard: {
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 24,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  statDetails: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  settingsCard: {
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 32,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  settingsItemText: {
    flex: 1,
    fontSize: 14,
    color: '#334155',
    marginLeft: 12,
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: '#eb5757',
    borderRadius: 12,
    height: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 8,
  },
});

export default UserProfileScreen;
