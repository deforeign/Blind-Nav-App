import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, 
  TextInput, Alert, ScrollView, SafeAreaView, StatusBar, Dimensions, Platform 
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { cloudClient, piClient } from '../api/client';

// --- IMPORT THE NEW COMPONENT ---
import LiveFeed from './../components/LiveFeed'; // Ensure the path matches your file structure

const { width } = Dimensions.get('window');

export default function HomeScreen({ route, navigation }) {
  const { pairCode, role } = route.params;
  
  const [cloudData, setCloudData] = useState({ emergencyContacts: [], friends: [] });
  const [navData, setNavData] = useState({ gps: { lat: 21.2514, lng: 81.6296 }, next_instruction: "Initializing..." });
  
  const [destination, setDestination] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [addType, setAddType] = useState('emergency');
  const [newName, setNewName] = useState('');
  const [newNum, setNewNum] = useState('');

  const fetchCloudData = useCallback(async () => {
    try {
      const response = await cloudClient.get(`/data/${pairCode}`);
      setCloudData(response.data || { emergencyContacts: [], friends: [] });
    } catch (e) {
      console.log("MongoDB Fetch Error:", e.message);
    }
  }, [pairCode]);

  const syncWithPi = useCallback(async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = location.coords;

      const response = await piClient.post('/update_and_get', {
        lat: latitude,
        lng: longitude
      });

      setNavData({
        gps: { lat: latitude, lng: longitude },
        next_instruction: response.data.instruction
      });
    } catch (e) {
      console.log("Pi Sync Error:", e.message);
    }
  }, []);

  useEffect(() => {
    fetchCloudData();
    const interval = setInterval(syncWithPi, 3000);
    return () => clearInterval(interval);
  }, [fetchCloudData, syncWithPi]);

  const triggerHaptic = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  const handleLogout = () => {
    triggerHaptic();
    Alert.alert("Logout", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: () => navigation.replace('Auth') }
    ]);
  };

  const renderContactItem = ({ item }) => (
    <View style={styles.listItem}>
      <View style={styles.itemInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name ? item.name.charAt(0).toUpperCase() : '?'}</Text>
        </View>
        <View>
          <Text style={styles.itemText}>{item.name}</Text>
          <Text style={styles.itemSub}>{item.number}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.callBtn} onPress={triggerHaptic}>
        <Text style={styles.callIcon}>📞</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <SafeAreaView style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>BlindNav AI</Text>
            <View style={styles.statusBadge}>
              <View style={styles.pulseDot} />
              <Text style={styles.statusText}>PI BRAIN ACTIVE</Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Exit</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
        
        {/* --- INTEGRATED LIVE FEED COMPONENT --- */}
        <LiveFeed />

        {/* 2. LIVE INSTRUCTION CARD */}
        <View style={styles.instructionCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.instructionLabel}>LIVE GUIDANCE</Text>
            <Text style={styles.instructionTime}>Real-time</Text>
          </View>
          <Text style={styles.instructionText}>{navData.next_instruction}</Text>
        </View>

        {/* 3. MAP VIEW */}
        <View style={styles.mapContainer}>
          <MapView 
            style={styles.map}
            userInterfaceStyle="dark" 
            region={{
              latitude: navData.gps.lat,
              longitude: navData.gps.lng,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            }}
          >
            <Marker coordinate={{ latitude: navData.gps.lat, longitude: navData.gps.lng }}>
              <View style={styles.userMarker}>
                <View style={styles.userMarkerInner} />
              </View>
            </Marker>
          </MapView>
        </View>

        {/* 4. DESTINATION INPUT */}
        <View style={styles.searchSection}>
          <TextInput 
            placeholder="Where to go?" 
            style={styles.searchInput} 
            placeholderTextColor="#666"
            onChangeText={setDestination}
          />
          <TouchableOpacity style={styles.goBtn} onPress={() => { triggerHaptic(); }}>
            <Text style={styles.goText}>GO</Text>
          </TouchableOpacity>
        </View>

        {/* 5. SAFETY NETWORK PANEL */}
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Safety Network</Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={[styles.smallActionBtn, { backgroundColor: '#ff4444' }]} 
                onPress={() => { setAddType('emergency'); setModalVisible(true); }}
              >
                <Text style={styles.btnText}>+ Emergency</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.smallActionBtn, { backgroundColor: '#007bff' }]} 
                onPress={() => { setAddType('friend'); setModalVisible(true); }}
              >
                <Text style={styles.btnText}>+ Friend</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.listLabel}>EMERGENCY CONTACTS</Text>
          <FlatList 
            scrollEnabled={false}
            data={cloudData.emergencyContacts}
            renderItem={renderContactItem}
            keyExtractor={(item, index) => 'e-' + index}
            ListEmptyComponent={<Text style={styles.emptyText}>No emergency contacts added.</Text>}
          />

          <Text style={[styles.listLabel, { marginTop: 20 }]}>TRUSTED FRIENDS</Text>
          <FlatList 
            scrollEnabled={false}
            data={cloudData.friends}
            renderItem={renderContactItem}
            keyExtractor={(item, index) => 'f-' + index}
            ListEmptyComponent={<Text style={styles.emptyText}>No friends added.</Text>}
          />
          
          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
         <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>New {addType === 'emergency' ? 'Emergency' : 'Friend'}</Text>
              <TextInput placeholder="Name" style={styles.modalInput} placeholderTextColor="#888" onChangeText={setNewName} />
              <TextInput placeholder="Number" style={styles.modalInput} placeholderTextColor="#888" keyboardType="phone-pad" onChangeText={setNewNum} />
              <View style={styles.modalButtons}>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalBtnCancel}><Text style={styles.btnText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => { /* Logic */ }} style={styles.modalBtnSave}><Text style={styles.btnText}>Save</Text></TouchableOpacity>
              </View>
            </View>
          </View>
      </Modal>
    </View>
  );
}

// Keep the same styles provided in previous turns...
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    header: { backgroundColor: '#111', borderBottomWidth: 1, borderBottomColor: '#222' },
    headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
    headerTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
    statusBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CD964', marginRight: 6 },
    statusText: { color: '#888', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
    logoutBtn: { backgroundColor: '#222', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10 },
    logoutText: { color: '#ff4444', fontWeight: 'bold', fontSize: 12 },
  
    scrollBody: { paddingTop: 10 },
    instructionCard: { backgroundColor: '#007AFF', margin: 15, padding: 20, borderRadius: 24, shadowColor: '#007AFF', shadowOpacity: 0.4, shadowRadius: 15, elevation: 8 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    instructionLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 'bold' },
    instructionTime: { color: 'rgba(255,255,255,0.6)', fontSize: 10 },
    instructionText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  
    mapContainer: { height: 200, marginHorizontal: 15, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#222' },
    map: { flex: 1 },
    userMarker: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0, 122, 255, 0.2)', alignItems: 'center', justifyContent: 'center' },
    userMarkerInner: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#007AFF', borderWidth: 2, borderColor: '#fff' },
  
    searchSection: { flexDirection: 'row', padding: 15, marginTop: 10 },
    searchInput: { flex: 1, backgroundColor: '#1c1c1e', borderRadius: 16, padding: 18, color: '#fff', fontSize: 16 },
    goBtn: { backgroundColor: '#4CD964', marginLeft: 10, paddingHorizontal: 25, borderRadius: 16, justifyContent: 'center' },
    goText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  
    panel: { backgroundColor: '#111', marginTop: 20, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 25, flex: 1 },
    panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    panelTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
    buttonRow: { flexDirection: 'row' },
    smallActionBtn: { marginLeft: 10, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  
    listLabel: { color: '#555', fontSize: 11, fontWeight: 'bold', letterSpacing: 1, marginBottom: 12 },
    listItem: { backgroundColor: '#1c1c1e', padding: 15, borderRadius: 18, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    itemInfo: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#333', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
    avatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    itemText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    itemSub: { color: '#666', fontSize: 13, marginTop: 2 },
    callBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#222', alignItems: 'center', justifyContent: 'center' },
    callIcon: { fontSize: 18 },
    emptyText: { color: '#444', fontStyle: 'italic', paddingLeft: 5 },
  
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#1c1c1e', borderRadius: 28, padding: 30, borderWidth: 1, borderColor: '#333' },
    modalTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 25 },
    modalInput: { backgroundColor: '#2c2c2e', borderRadius: 12, padding: 18, color: '#fff', marginBottom: 15 },
    modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    modalBtnCancel: { flex: 0.48, padding: 15, borderRadius: 12, backgroundColor: '#333', alignItems: 'center' },
    modalBtnSave: { flex: 0.48, padding: 15, borderRadius: 12, backgroundColor: '#007AFF', alignItems: 'center' }
});