import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, 
  TextInput, Alert, ScrollView, SafeAreaView, StatusBar, Dimensions, Platform 
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { cloudClient, piClient } from '../api/client';

export default function HomeScreen({ route, navigation }) {
  const { pairCode, role } = route.params;
  
  // --- FIXED: SEPARATE STATES ---
  // cloudData stores your permanent MongoDB contacts
  const [cloudData, setCloudData] = useState({ emergencyContacts: [], friends: [] });
  // navData stores your temporary Pi navigation commands
  const [navData, setNavData] = useState({ gps: { lat: 21.2514, lng: 81.6296 }, next_instruction: "Initializing..." });
  
  const [destination, setDestination] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [addType, setAddType] = useState('emergency');
  const [newName, setNewName] = useState('');
  const [newNum, setNewNum] = useState('');

  // 1. FIXED: CLOUD FETCH (MongoDB Atlas)
  const fetchCloudData = useCallback(async () => {
    try {
      const response = await cloudClient.get(`/data/${pairCode}`);
      // Only update cloudData state
      setCloudData(response.data || { emergencyContacts: [], friends: [] });
    } catch (e) {
      console.log("MongoDB Fetch Error:", e.message);
    }
  }, [pairCode]);

  // 2. FIXED: PI SYNC (Raspberry Pi Brain)
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

      // FIXED: Only update navData so it doesn't overwrite your contacts
      setNavData({
        gps: { lat: latitude, lng: longitude },
        next_instruction: response.data.instruction
      });
    } catch (e) {
      console.log("Pi Sync Error:", e.message);
    }
  }, []);

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

  const handleAddItem = async () => {
    const endpoint = addType === 'emergency' ? '/data/add-emergency' : '/data/add-friend';
    try {
      await cloudClient.post(endpoint, { pairCode, name: newName, number: newNum });
      setModalVisible(false);
      setNewName('');
      setNewNum('');
      fetchCloudData(); // Refresh list from MongoDB
    } catch (e) {
      Alert.alert("Error", "Could not save contact.");
    }
  };

  useEffect(() => {
    fetchCloudData(); // Load contacts once from MongoDB
    const interval = setInterval(syncWithPi, 3000); // Start navigation heartbeat
    return () => clearInterval(interval);
  }, [fetchCloudData, syncWithPi]);

  const triggerHaptic = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
      <TouchableOpacity style={styles.callBtn}>
        <Text style={styles.callText}>📞</Text>
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
            <View style={styles.badge}>
              <View style={styles.pulseDot} />
              <Text style={styles.headerSubtitle}>HYBRID: MAC CLOUD + PI BRAIN</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => navigation.replace('Auth')} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* INSTRUCTION CARD - FIXED: uses navData */}
        <View style={styles.instructionCard}>
          <Text style={styles.instructionLabel}>NEXT STEP</Text>
          <Text style={styles.instructionText}>{navData.next_instruction}</Text>
        </View>

        {/* MAP SECTION - FIXED: uses navData */}
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
              <View style={styles.userMarker}><View style={styles.userMarkerInner} /></View>
            </Marker>
          </MapView>
        </View>

        {/* PANEL SECTION */}
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

          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#ff4444' }]} onPress={() => { setAddType('emergency'); setModalVisible(true); }}>
              <Text style={styles.btnText}>+ EMERGENCY</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#007bff' }]} onPress={() => { setAddType('friend'); setModalVisible(true); }}>
              <Text style={styles.btnText}>+ FRIEND</Text>
            </TouchableOpacity>
          </View>

          {/* FIXED: Lists now map to cloudData */}
          <Text style={styles.sectionTitle}>Emergency Network</Text>
          <FlatList 
            scrollEnabled={false}
            data={cloudData.emergencyContacts}
            renderItem={renderContactItem}
            keyExtractor={(item, index) => 'e-' + index}
            ListEmptyComponent={<Text style={styles.emptyText}>No contacts in MongoDB.</Text>}
          />

          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Trusted Friends</Text>
          <FlatList 
            scrollEnabled={false}
            data={cloudData.friends}
            renderItem={renderContactItem}
            keyExtractor={(item, index) => 'f-' + index}
            ListEmptyComponent={<Text style={styles.emptyText}>No friends added yet.</Text>}
          />
          <View style={{ height: 50 }} />
        </View>
      </ScrollView>

      {/* ADD CONTACT MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add {addType === 'emergency' ? 'Emergency' : 'Friend'}</Text>
            <TextInput placeholder="Name" style={styles.modalInput} placeholderTextColor="#888" onChangeText={setNewName} />
            <TextInput placeholder="Number" style={styles.modalInput} placeholderTextColor="#888" keyboardType="phone-pad" onChangeText={setNewNum} />
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={[styles.modalBtn, { backgroundColor: '#333' }]}><Text style={styles.btnText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleAddItem} style={[styles.modalBtn, { backgroundColor: '#28a745' }]}><Text style={styles.btnText}>Save</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  
  instructionCard: { backgroundColor: '#007bff', marginHorizontal: 15, marginBottom: 15, padding: 20, borderRadius: 20 },
  instructionLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '900' },
  instructionText: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 5 },

  mapContainer: { height: 250, width: '100%', marginBottom: 15 },
  map: { flex: 1 },
  userMarker: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0, 123, 255, 0.3)', alignItems: 'center', justifyContent: 'center' },
  userMarkerInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#007bff', borderWidth: 2, borderColor: '#fff' },

  panel: { backgroundColor: '#161616', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 20, marginTop: -20 },
  searchRow: { flexDirection: 'row', marginBottom: 20 },
  searchInput: { flex: 1, backgroundColor: '#222', borderRadius: 15, padding: 15, color: '#fff' },
  goBtn: { backgroundColor: '#28a745', marginLeft: 10, paddingHorizontal: 20, borderRadius: 15, justifyContent: 'center' },
  goText: { color: '#fff', fontWeight: '900' },

  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  actionBtn: { flex: 0.48, height: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 12 },

  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '800', marginBottom: 10 },
  listItem: { backgroundColor: '#222', padding: 15, borderRadius: 15, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#333', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontWeight: 'bold' },
  itemText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  itemSub: { color: '#666', fontSize: 12 },
  emptyText: { color: '#444', fontStyle: 'italic' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#161616', borderRadius: 25, padding: 25, borderWidth: 1, borderColor: '#333' },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  modalInput: { backgroundColor: '#222', borderRadius: 12, padding: 15, color: '#fff', marginBottom: 15 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  modalBtn: { flex: 0.48, padding: 15, borderRadius: 12, alignItems: 'center' }
});