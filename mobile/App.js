import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import HomeScreen from './screens/HomeScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import DashboardScreen from './screens/DashboardScreen';
import ScanReceiptScreen from './screens/ScanReceiptScreen';
import ProductVerificationScreen from './screens/ProductVerificationScreen';
import ProductPassportScreen from './screens/ProductPassportScreen';
import TransferRequestsScreen from './screens/TransferRequestsScreen';
import UserProfileScreen from './screens/UserProfileScreen';
import ProductManualsScreen from './screens/ProductManualsScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Vaultify' }} />
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Login' }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Register' }} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Dashboard', headerLeft: () => null }} />
        <Stack.Screen name="ScanReceipt" component={ScanReceiptScreen} options={{ title: 'Scan Receipt' }} />
        <Stack.Screen name="ProductVerification" component={ProductVerificationScreen} options={{ title: 'Verify Details' }} />
        <Stack.Screen name="ProductPassport" component={ProductPassportScreen} options={{ title: 'Product Passport' }} />
        <Stack.Screen name="TransferRequests" component={TransferRequestsScreen} options={{ title: 'Pending Transfers' }} />
        <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ title: 'My Profile' }} />
        <Stack.Screen name="ProductManuals" component={ProductManualsScreen} options={{ title: 'Product Manuals' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
