import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getLocalHost = () => {
  // Prefer Expo-provided host values when available (works on expo start)
  const hostFromManifest =
    // older SDK
    Constants.manifest?.debuggerHost ||
    // newer SDKs
    Constants.manifest2?.debuggerHost ||
    // expo-go
    Constants.expoGo?.debuggerHost ||
    Constants.expoGo?.hostUri ||
    // fallback
    Constants.manifest?.packagerOpts?.host;

  if (hostFromManifest) {
    return hostFromManifest.split(':')[0];
  }

  if (Platform.OS === 'android') {
    // Android emulator -> host machine
    return '10.0.2.2';
  }

  // iOS simulator and physical devices on same network should use LAN host
  return 'localhost';
};

const host = getLocalHost();
const API_PORT = 5002;
console.log('Vaultify API host:', host);
export const API_BASE_URLS = [
  `http://${host}:${API_PORT}`,
];
