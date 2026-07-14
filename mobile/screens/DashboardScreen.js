import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const DashboardScreen = ({ route, navigation }) => {
  const { user } = route.params || {};

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Welcome back,</Text>
      <Text style={styles.userName}>{user?.name || 'User'}</Text>
      <Text style={styles.subtitle}>You are now logged into Vaultify.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your account</Text>
        <Text style={styles.cardText}>Email: {user?.email || 'Not available'}</Text>
        <Text style={styles.cardText}>Member since today</Text>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => Alert.alert('Coming soon', 'Phase 2 features will be available here.')}
      >
        <Text style={styles.primaryButtonText}>Go to Wallet</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={() => navigation.navigate('Home')}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#f7f8fc',
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  userName: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    color: '#4a4a4a',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  cardText: {
    fontSize: 16,
    color: '#4a4a4a',
    marginBottom: 6,
  },
  primaryButton: {
    backgroundColor: '#2f80ed',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  logoutButton: {
    backgroundColor: '#eb5757',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});

export default DashboardScreen;
