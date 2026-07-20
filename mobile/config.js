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
    // Android emulator/device -> host machine
    return '172.25.237.156';
  }

  // iOS simulator and physical devices on same network should use LAN host
  return 'localhost';
};

const host = getLocalHost();
const API_PORT = 5001; // Backend runs on 5001 by default
console.log('Vaultify API host:', host);
export const API_BASE_URLS = [
  'https://vaultify-ii4q.onrender.com', // Deployed Render URL
];
