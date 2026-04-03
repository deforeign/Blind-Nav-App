import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, 
  TextInput, Alert, ScrollView, SafeAreaView, StatusBar, Dimensions, Platform 
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location'; // New Import
import { cloudClient, piClient } from '../api/client';

export default function HomeScreen({ route, navigation }) {
  const { pairCode, role } = route.params;
  
  // State
  const [data, setData] = useState({ gps: { lat: 21.2514, lng: 81.6296 }, next_instruction: "Waiting..." });
  const [destination, setDestination] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [addType, setAddType] = useState('emergency');
  const [newName, setNewName] = useState('');
  const [newNum, setNewNum] = useState('');

  // 1. SYNC WITH PI: Send iPhone GPS -> Get Pi Instruction
  const syncWithPi = useCallback(async () => {
    try {
      // Get iPhone's actual location
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = location.coords;

      // POST to Pi (Brain) and GET Instruction back in one call
      const response = await piClient.post('/update_and_get', {
        lat: latitude,
        lng: longitude
      });

      setData({
        gps: { lat: latitude, lng: longitude },
        next_instruction: response.data.instruction
      });
    } catch (e) {
      console.log("Pi Sync Error:", e.message);
    }
  }, []);

  // 2. Set Destination on Pi
  const handleSetDestination = async () => {
    if (!destination) return;
    try {
      await piClient.post('/set_destination', { address: destination });
      triggerHaptic();
      Alert.alert("Route Started", `Navigating to ${destination}`);
    } catch (e) {
      Alert.alert("Error", "Could not reach the Pi Brain.");
    }
  };

  useEffect(() => {
    const interval = setInterval(syncWithPi, 3000); // Sync every 3 seconds
    return () => clearInterval(interval);
  }, [syncWithPi]);

  const triggerHaptic = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleLogout = () => {
    triggerHaptic();
    Alert.alert("Exit Session", "Logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: () => navigation.replace('Auth') }
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* HEADER */}
      <SafeAreaView style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>BlindNav AI</Text>
            <View style={styles.badge}>
              <View style={styles.pulseDot} />
              <Text style={styles.headerSubtitle}>BRAIN: RASPBERRY PI</Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* NAVIGATION INSTRUCTION CARD */}
      <View style={styles.instructionCard}>
        <Text style={styles.instructionLabel}>NEXT STEP</Text>
        <Text style={styles.instructionText}>{data.next_instruction}</Text>
      </View>

      {/* MAP SECTION */}
      <View style={styles.mapContainer}>
        <MapView 
          style={styles.map}
          userInterfaceStyle="dark" 
          region={{
            latitude: data.gps.lat,
            longitude: data.gps.lng,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }}
        >
          <Marker coordinate={{ latitude: data.gps.lat, longitude: data.gps.lng }}>
            <View style={styles.userMarker}><View style={styles.userMarkerInner} /></View>
          </Marker>
        </MapView>
      </View>

      {/* SEARCH & PANEL */}
      <View style={styles.panel}>
        <View style={styles.searchRow}>
          <TextInput 
            placeholder="Enter Destination..." 
            style={styles.searchInput} 
            placeholderTextColor="#888"
            onChangeText={setDestination}
          />
          <TouchableOpacity style={styles.goBtn} onPress={handleSetDestination}>
            <Text style={styles.goText}>GO</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#ff4444' }]} onPress={() => { setAddType('emergency'); setModalVisible(true); }}>
              <Text style={styles.btnText}>+ EMERGENCY</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#007bff' }]} onPress={() => { setAddType('friend'); setModalVisible(true); }}>
              <Text style={styles.btnText}>+ FRIEND</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionTitle}>Safety Network</Text>
          <Text style={styles.emptyText}>Pulling contacts from Pi...</Text>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: { backgroundColor: '#141414', borderBottomWidth: 1, borderBottomColor: '#222' },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '900' },
  badge: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#28a745', marginRight: 6 },
  headerSubtitle: { color: '#888', fontSize: 10, fontWeight: '800' },
  logoutBtn: { padding: 8, borderRadius: 12, backgroundColor: '#222' },
  logoutText: { color: '#ff4444', fontWeight: 'bold', fontSize: 12 },
  
  instructionCard: { backgroundColor: '#007bff', margin: 15, padding: 20, borderRadius: 20, shadowColor: '#007bff', shadowOpacity: 0.3, shadowRadius: 10 },
  instructionLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  instructionText: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 5 },

  mapContainer: { height: '30%', width: '100%' },
  map: { flex: 1 },
  userMarker: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0, 123, 255, 0.3)', alignItems: 'center', justifyContent: 'center' },
  userMarkerInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#007bff', borderWidth: 2, borderColor: '#fff' },

  panel: { flex: 1, backgroundColor: '#161616', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 20, marginTop: -20 },
  searchRow: { flexDirection: 'row', marginBottom: 20 },
  searchInput: { flex: 1, backgroundColor: '#222', borderRadius: 15, padding: 15, color: '#fff' },
  goBtn: { backgroundColor: '#28a745', marginLeft: 10, paddingHorizontal: 20, borderRadius: 15, justifyContent: 'center' },
  goText: { color: '#fff', fontWeight: '900' },

  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  actionBtn: { flex: 0.48, height: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '800', marginBottom: 10 },
  emptyText: { color: '#444', fontStyle: 'italic' }
});