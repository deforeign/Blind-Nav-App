import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  StatusBar
} from 'react-native';
import { cloudClient, piClient } from '../api/client';

export default function AuthScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pairCode, setPairCode] = useState('');
  const [role, setRole] = useState('blind');
  const [loading, setLoading] = useState(false);
  const [focusStates, setFocusStates] = useState({ email: false, password: false, pairCode: false });

  const handleAuth = async (type) => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill email and password");
      return;
    }
    setLoading(true);
    try {
      const endpoint = type === 'login' ? '/auth/login' : '/auth/register';
      const response = await cloudClient.post(endpoint, { email, password, role, pairCode });
      navigation.replace('Home', { pairCode: response.data.pairCode || pairCode, role: response.data.role || role });
    } catch (error) {
      Alert.alert("Auth Error", error.response?.data?.error || "Connection failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <View style={styles.gradientBg} />
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>BlindNav</Text>
            <Text style={styles.subtitle}>Navigate with confidence 👁️</Text>
          </View>

          <TextInput
            style={[styles.input, focusStates.email && styles.inputFocus]}
            placeholder="Email"
            placeholderTextColor="#888"
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            onFocus={() => setFocusStates({...focusStates, email: true})}
            onBlur={() => setFocusStates({...focusStates, email: false})}
            accessibilityLabel="Email address"
            accessibilityHint="Enter your email"
          />
          
          <TextInput
            style={[styles.input, focusStates.password && styles.inputFocus]}
            placeholder="Password"
            placeholderTextColor="#888"
            secureTextEntry
            onChangeText={setPassword}
            onFocus={() => setFocusStates({...focusStates, password: true})}
            onBlur={() => setFocusStates({...focusStates, password: false})}
            accessibilityLabel="Password"
            accessibilityHint="Enter your password"
          />
          
          <TextInput
            style={[styles.input, focusStates.pairCode && styles.inputFocus]}
            placeholder="Pair Code (e.g. TEAM1)"
            placeholderTextColor="#888"
            onChangeText={setPairCode}
            onFocus={() => setFocusStates({...focusStates, pairCode: true})}
            onBlur={() => setFocusStates({...focusStates, pairCode: false})}
            accessibilityLabel="Pair code"
            accessibilityHint="Enter team pair code"
          />
          
          <View style={styles.roleContainer}>
            <TouchableOpacity 
              style={[styles.roleBtn, role === 'blind' && styles.activeRole]}
              onPress={() => setRole('blind')}
              accessibilityRole="radio"
              accessibilityState={{selected: role === 'blind'}}
              accessibilityLabel="Blind user role"
            >
              <Text style={styles.roleText}>👤 Blind User</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.roleBtn, role === 'advisor' && styles.activeRole]}
              onPress={() => setRole('advisor')}
              accessibilityRole="radio"
              accessibilityState={{selected: role === 'advisor'}}
              accessibilityLabel="Advisor role"
            >
              <Text style={styles.roleText}>🧑 Advisor</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.primaryBtn, loading && styles.disabledBtn]} 
            onPress={() => handleAuth('login')}
            disabled={loading}
            accessibilityLabel="Login button"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>LOGIN</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.secondaryBtn, loading && styles.disabledBtn]} 
            onPress={() => handleAuth('register')}
            disabled={loading}
            accessibilityLabel="Create account button"
          >
            <Text style={styles.secondaryBtnText}>CREATE ACCOUNT</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0a0a0a', 
    justifyContent: 'center', 
    padding: 24 
  },
  gradientBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    opacity: 0.3,
  },
  card: { 
    backgroundColor: 'rgba(30, 30, 30, 0.9)',
    padding: 36,
    borderRadius: 24,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backdropFilter: 'blur(20px)',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: { 
    fontSize: 40, 
    fontWeight: '900', 
    color: '#fff', 
    textAlign: 'center',
    letterSpacing: -1,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
    fontWeight: '500',
  },
  input: { 
    backgroundColor: 'rgba(50, 50, 50, 0.8)',
    color: '#fff', 
    padding: 18, 
    borderRadius: 16, 
    marginBottom: 20,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  inputFocus: {
    borderColor: '#007bff',
    backgroundColor: 'rgba(60, 60, 60, 0.9)',
    shadowColor: '#007bff',
    shadowOpacity: 0.3,
    elevation: 8,
  },
  roleContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 32,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  roleBtn: { 
    flex: 1, 
    paddingVertical: 16, 
    alignItems: 'center', 
    borderRadius: 12,
    marginHorizontal: 8,
    backgroundColor: 'transparent',
  },
  activeRole: { 
    backgroundColor: 'rgba(0, 123, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 123, 255, 0.3)',
  },
  roleText: { 
    color: '#ccc', 
    fontWeight: '700',
    fontSize: 16,
  },
  primaryBtn: { 
    backgroundColor: '#007bff',
    paddingVertical: 18, 
    borderRadius: 16, 
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#007bff',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  secondaryBtn: {
    backgroundColor: 'rgba(40, 167, 69, 0.9)',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#28a745',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  disabledBtn: {
    opacity: 0.7,
  },
  btnText: { 
    color: '#fff', 
    fontWeight: '800', 
    fontSize: 18,
    letterSpacing: 1,
  },
  secondaryBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 18,
    letterSpacing: 1,
  },
});
