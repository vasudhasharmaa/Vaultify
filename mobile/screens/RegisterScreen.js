import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { post } from '../api';
import { GOOGLE_AUTH_CONFIG } from '../googleConfig';

WebBrowser.maybeCompleteAuthSession();

const RegisterScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: GOOGLE_AUTH_CONFIG.expoClientId,
    androidClientId: GOOGLE_AUTH_CONFIG.androidClientId,
    iosClientId: GOOGLE_AUTH_CONFIG.iosClientId,
    webClientId: GOOGLE_AUTH_CONFIG.webClientId,
    scopes: GOOGLE_AUTH_CONFIG.scopes,
  });

  React.useEffect(() => {
    const handleGoogleLogin = async () => {
      if (response?.type === 'success') {
        const { authentication } = response;
        const accessToken = authentication?.accessToken;
        if (!accessToken) {
          Alert.alert('Google Login Error', 'Could not retrieve access token.');
          return;
        }

        setLoading(true);
        try {
          const res = await post('/api/auth/google', { token: accessToken });
          const { token, user } = res.data;
          navigation.navigate('Dashboard', { user, token });
        } catch (error) {
          console.error('Google login error:', error);
          const message =
            error.response?.data?.message ||
            error.message ||
            'Unable to login with Google.';
          Alert.alert('Google Login Failed', message);
        } finally {
          setLoading(false);
        }
      }
    };

    handleGoogleLogin();
  }, [response]);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert('Validation', 'Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      await post('/api/auth/register', {
        name,
        email,
        password,
      });

      Alert.alert('Registration successful', 'You can now login with your email and password.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (error) {
      console.error('Register error:', error);
      const message =
        error.response?.data?.message ||
        error.message ||
        'Unable to register.';
      Alert.alert('Registration failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Create an account</Text>
      <TextInput
        style={styles.input}
        placeholder="Full name"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity style={styles.googleButton} onPress={() => promptAsync()} disabled={!request || loading}>
        <FontAwesome name="google" size={20} color="#EA4335" />
        <Text style={styles.googleText}>Continue with Google</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Registering...' : 'Register'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.link}>Already have an account? Login</Text>
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
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  button: {
    backgroundColor: '#2f80ed',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderColor: '#d9d9d9',
    borderWidth: 1,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 14,
  },
  googleText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#444',
    fontWeight: '700',
  },
  link: {
    color: '#2f80ed',
    textAlign: 'center',
    marginTop: 12,
  },
});

export default RegisterScreen;
