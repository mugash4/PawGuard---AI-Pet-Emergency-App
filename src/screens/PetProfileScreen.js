/**
 * Pet Profile Screen - COMPLETE IMPLEMENTATION
 * Fixed: German to English, Added vet finder, emergency contact features
 * All features from PfotenDoc + Emergency help integration
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Image,
  Platform,
  Alert,
  KeyboardAvoidingView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useUser } from '../context/UserContext';
import { useInterstitialAd } from '../hooks/useInterstitialAd';
import AdBanner from '../components/AdBanner';
import { savePetProfile, getPetProfile } from '../services/storageService';
import { scheduleVaccinationReminder, scheduleHealthCheckReminder } from '../services/notificationService';
import { COLORS, FONTS, SPACING, SHADOWS, BORDER_RADIUS } from '../constants/theme';

export default function PetProfileScreen({ navigation }) {
  useInterstitialAd(navigation);
  const { user } = useUser();

  const [pets, setPets] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'vaccinations' | 'documents'
  const [selectedPet, setSelectedPet] = useState(null);
  
  // Form state
  const [editingPet, setEditingPet] = useState(null);
  const [petPhoto, setPetPhoto] = useState(null);
  const [petName, setPetName] = useState('');
  const [breed, setBreed] = useState('');
  const [birthDate, setBirthDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState('male');
  const [furColor, setFurColor] = useState('');
  const [weight, setWeight] = useState('');
  const [microchipNumber, setMicrochipNumber] = useState('');
  const [vetName, setVetName] = useState('');
  const [vetPhone, setVetPhone] = useState('');
  const [notes, setNotes] = useState('');
  
  // Vaccination state
  const [vaccinations, setVaccinations] = useState([]);
  const [vaccinationModalVisible, setVaccinationModalVisible] = useState(false);
  const [vaccinationName, setVaccinationName] = useState('');
  const [vaccinationDate, setVaccinationDate] = useState(new Date());
  const [showVaccinationDatePicker, setShowVaccinationDatePicker] = useState(false);

  useEffect(() => {
    loadPetProfiles();
  }, []);

  const loadPetProfiles = async () => {
    try {
      const profiles = await getPetProfile(user.userId);
      setPets(profiles || []);
    } catch (error) {
      console.error('Error loading pet profiles:', error);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permission to add pet photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setPetPhoto(result.assets[0].uri);
    }
  };

  const openAddPetModal = () => {
    resetForm();
    setEditingPet(null);
    setModalVisible(true);
  };

  const openEditPetModal = (pet) => {
    setEditingPet(pet);
    setPetPhoto(pet.photo);
    setPetName(pet.name);
    setBreed(pet.breed || '');
    setBirthDate(pet.birthDate ? new Date(pet.birthDate) : new Date());
    setGender(pet.gender || 'male');
    setFurColor(pet.furColor || '');
    setWeight(pet.weight || '');
    setMicrochipNumber(pet.microchipNumber || '');
    setVetName(pet.vetName || '');
    setVetPhone(pet.vetPhone || '');
    setNotes(pet.notes || '');
    setVaccinations(pet.vaccinations || []);
    setModalVisible(true);
  };

  const resetForm = () => {
    setPetPhoto(null);
    setPetName('');
    setBreed('');
    setBirthDate(new Date());
    setGender('male');
    setFurColor('');
    setWeight('');
    setMicrochipNumber('');
    setVetName('');
    setVetPhone('');
    setNotes('');
    setVaccinations([]);
  };

  const savePet = async () => {
    if (!petName.trim()) {
      Alert.alert('Name Required', 'Please enter your pet\'s name.');
      return;
    }

    const petData = {
      id: editingPet ? editingPet.id : Date.now().toString(),
      photo: petPhoto,
      name: petName.trim(),
      breed: breed.trim(),
      birthDate: birthDate.toISOString(),
      gender,
      furColor: furColor.trim(),
      weight: weight.trim(),
      microchipNumber: microchipNumber.trim(),
      vetName: vetName.trim(),
      vetPhone: vetPhone.trim(),
      notes: notes.trim(),
      vaccinations,
      createdAt: editingPet ? editingPet.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      let updatedPets;
      if (editingPet) {
        updatedPets = pets.map(p => p.id === editingPet.id ? petData : p);
      } else {
        updatedPets = [...pets, petData];
      }
      
      await savePetProfile(user.userId, updatedPets);
      setPets(updatedPets);
      setModalVisible(false);
      Alert.alert('Success', editingPet ? 'Pet profile updated!' : 'Pet profile created!');
    } catch (error) {
      console.error('Error saving pet:', error);
      Alert.alert('Error', 'Failed to save pet profile. Please try again.');
    }
  };

  const deletePet = async (petId) => {
    Alert.alert(
      'Delete Pet Profile',
      'Are you sure you want to delete this pet profile? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedPets = pets.filter(p => p.id !== petId);
              await savePetProfile(user.userId, updatedPets);
              setPets(updatedPets);
            } catch (error) {
              console.error('Error deleting pet:', error);
              Alert.alert('Error', 'Failed to delete pet profile.');
            }
          },
        },
      ]
    );
  };

  const addVaccination = async () => {
    if (!vaccinationName.trim()) {
      Alert.alert('Name Required', 'Please enter vaccination name.');
      return;
    }

    const newVaccination = {
      id: Date.now().toString(),
      name: vaccinationName.trim(),
      date: vaccinationDate.toISOString(),
      createdAt: new Date().toISOString(),
    };

    const updatedVaccinations = [...vaccinations, newVaccination];
    setVaccinations(updatedVaccinations);

    // Schedule reminder notification
    try {
      await scheduleVaccinationReminder({
        name: vaccinationName.trim(),
        date: vaccinationDate.toISOString(),
        petName: petName || 'Your pet',
        petId: editingPet?.id || 'new',
      });
    } catch (error) {
      console.error('Error scheduling reminder:', error);
    }

    setVaccinationName('');
    setVaccinationDate(new Date());
    setVaccinationModalVisible(false);
    Alert.alert('Success', 'Vaccination added and reminder scheduled!');
  };

  const findNearbyVets = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Please enable location permission to find nearby veterinary clinics.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }

      Alert.alert('Finding Vets', 'Getting your location...');
      
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      // Open Google Maps with nearby vet search
      const url = Platform.select({
        ios: `maps://maps.google.com/maps?q=veterinary+clinic&center=${latitude},${longitude}`,
        android: `geo:${latitude},${longitude}?q=veterinary+clinic`,
      });

      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        // Fallback to web browser
        const webUrl = `https://www.google.com/maps/search/veterinary+clinic/@${latitude},${longitude},15z`;
        await Linking.openURL(webUrl);
      }
    } catch (error) {
      console.error('Error finding vets:', error);
      Alert.alert('Error', 'Could not find nearby vets. Please try again.');
    }
  };

  const callEmergencyVet = (phoneNumber) => {
    if (!phoneNumber) {
      Alert.alert('No Phone Number', 'Please add your vet\'s phone number in pet profile.');
      return;
    }

    Alert.alert(
      'Call Emergency Vet',
      `Call ${phoneNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call Now',
          onPress: () => {
            const url = `tel:${phoneNumber}`;
            Linking.openURL(url);
          },
        },
      ]
    );
  };

  const calculateAge = (birthDate) => {
    const birth = new Date(birthDate);
    const today = new Date();
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    
    if (months < 0) {
      years--;
      months += 12;
    }
    
    if (years === 0) {
      return `${months} month${months !== 1 ? 's' : ''}`;
    }
    return `${years} year${years !== 1 ? 's' : ''} ${months} month${months !== 1 ? 's' : ''}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🐾 Pet Profile</Text>
          <Text style={styles.subtitle}>Manage Your Pet Information</Text>
        </View>

        {/* Emergency Actions */}
        <View style={styles.emergencySection}>
          <Text style={styles.emergencySectionTitle}>🚨 Emergency Help</Text>
          <View style={styles.emergencyButtons}>
            <TouchableOpacity
              style={styles.emergencyButton}
              onPress={findNearbyVets}
            >
              <Ionicons name="location" size={24} color="#FFFFFF" />
              <Text style={styles.emergencyButtonText}>Find Nearby Vets</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.emergencyButton, styles.emergencyButtonSecondary]}
              onPress={() => navigation.navigate('Emergency')}
            >
              <Ionicons name="medical" size={24} color="#FFFFFF" />
              <Text style={styles.emergencyButtonText}>First Aid Guide</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Add Pet Button */}
        <TouchableOpacity style={styles.addButton} onPress={openAddPetModal}>
          <Ionicons name="add-circle" size={24} color="#FFFFFF" />
          <Text style={styles.addButtonText}>+ Add Pet Profile</Text>
        </TouchableOpacity>

        {/* Pet List */}
        {pets.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="paw" size={60} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyTitle}>No Profiles Yet</Text>
            <Text style={styles.emptyText}>
              Create your pet's profile to store important health information, vaccination records, and emergency contacts.
            </Text>
          </View>
        ) : (
          pets.map((pet) => (
            <View key={pet.id} style={styles.petCard}>
              {/* Pet Header */}
              <TouchableOpacity
                style={styles.petHeader}
                onPress={() => {
                  setSelectedPet(pet);
                  setActiveTab('info');
                }}
              >
                <View style={styles.petPhotoContainer}>
                  {pet.photo ? (
                    <Image source={{ uri: pet.photo }} style={styles.petPhoto} />
                  ) : (
                    <View style={styles.petPhotoPlaceholder}>
                      <Ionicons name="paw" size={32} color={COLORS.primary} />
                    </View>
                  )}
                </View>
                <View style={styles.petInfo}>
                  <Text style={styles.petName}>{pet.name}</Text>
                  {pet.breed && <Text style={styles.petBreed}>{pet.breed}</Text>}
                  <Text style={styles.petAge}>
                    {calculateAge(pet.birthDate)} • {pet.gender === 'male' ? '♂ Male' : '♀ Female'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => openEditPetModal(pet)}
                >
                  <Ionicons name="create-outline" size={24} color={COLORS.primary} />
                </TouchableOpacity>
              </TouchableOpacity>

              {/* Pet Details */}
              <View style={styles.petDetails}>
                {pet.furColor && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Fur Color:</Text>
                    <Text style={styles.detailValue}>{pet.furColor}</Text>
                  </View>
                )}
                {pet.weight && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Weight:</Text>
                    <Text style={styles.detailValue}>{pet.weight} kg</Text>
                  </View>
                )}
                {pet.microchipNumber && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Microchip:</Text>
                    <Text style={styles.detailValue}>{pet.microchipNumber}</Text>
                  </View>
                )}
                {pet.vetName && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Veterinarian:</Text>
                    <Text style={styles.detailValue}>{pet.vetName}</Text>
                  </View>
                )}
              </View>

              {/* Emergency Contact */}
              {pet.vetPhone && (
                <TouchableOpacity
                  style={styles.vetCallButton}
                  onPress={() => callEmergencyVet(pet.vetPhone)}
                >
                  <Ionicons name="call" size={20} color="#FFFFFF" />
                  <Text style={styles.vetCallButtonText}>Call Vet: {pet.vetPhone}</Text>
                </TouchableOpacity>
              )}

              {/* Vaccinations Preview */}
              {pet.vaccinations && pet.vaccinations.length > 0 && (
                <View style={styles.vaccinationsPreview}>
                  <Text style={styles.vaccinationsTitle}>
                    💉 Vaccinations ({pet.vaccinations.length})
                  </Text>
                  {pet.vaccinations.slice(0, 2).map((vac) => (
                    <View key={vac.id} style={styles.vaccinationItem}>
                      <Text style={styles.vaccinationName}>{vac.name}</Text>
                      <Text style={styles.vaccinationDate}>
                        {new Date(vac.date).toLocaleDateString()}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Actions */}
              <View style={styles.petActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => openEditPetModal(pet)}
                >
                  <Ionicons name="create-outline" size={20} color={COLORS.primary} />
                  <Text style={styles.actionButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => deletePet(pet.id)}
                >
                  <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                  <Text style={[styles.actionButtonText, { color: '#FF3B30' }]}>
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color={COLORS.primary} />
          <Text style={styles.infoText}>
            Store all your pet's important information in one place. Find nearby vets, schedule vaccination reminders, and access emergency help instantly.
          </Text>
        </View>
      </ScrollView>

      {/* AdMob Banner at Bottom (only for free users) */}
      {!user.isPremium && <AdBanner />}

      {/* Add/Edit Pet Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingPet ? 'Edit Pet Profile' : 'Add Pet Profile'}
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'info' && styles.tabActive]}
                onPress={() => setActiveTab('info')}
              >
                <Text style={[styles.tabText, activeTab === 'info' && styles.tabTextActive]}>
                  Info
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'vaccinations' && styles.tabActive]}
                onPress={() => setActiveTab('vaccinations')}
              >
                <Text style={[styles.tabText, activeTab === 'vaccinations' && styles.tabTextActive]}>
                  Vaccinations
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {activeTab === 'info' && (
                <>
                  {/* Photo Picker */}
                  <TouchableOpacity style={styles.photoPicker} onPress={pickImage}>
                    {petPhoto ? (
                      <Image source={{ uri: petPhoto }} style={styles.photoPreview} />
                    ) : (
                      <View style={styles.photoPlaceholder}>
                        <Ionicons name="camera" size={32} color={COLORS.textLight} />
                        <Text style={styles.photoPlaceholderText}>Add Photo</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Name */}
                  <Text style={styles.inputLabel}>Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Pet name"
                    value={petName}
                    onChangeText={setPetName}
                  />

                  {/* Breed */}
                  <Text style={styles.inputLabel}>Breed</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Golden Retriever"
                    value={breed}
                    onChangeText={setBreed}
                  />

                  {/* Birth Date */}
                  <Text style={styles.inputLabel}>Birth Date</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
                    <Text style={styles.dateButtonText}>
                      {birthDate.toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>

                  {showDatePicker && (
                    <DateTimePicker
                      value={birthDate}
                      mode="date"
                      display="default"
                      onChange={(event, selectedDate) => {
                        setShowDatePicker(Platform.OS === 'ios');
                        if (selectedDate) setBirthDate(selectedDate);
                      }}
                      maximumDate={new Date()}
                    />
                  )}

                  {/* Gender */}
                  <Text style={styles.inputLabel}>Gender</Text>
                  <View style={styles.genderContainer}>
                    <TouchableOpacity
                      style={[
                        styles.genderButton,
                        gender === 'male' && styles.genderButtonActive,
                      ]}
                      onPress={() => setGender('male')}
                    >
                      <Ionicons
                        name="male"
                        size={20}
                        color={gender === 'male' ? '#FFFFFF' : COLORS.text}
                      />
                      <Text
                        style={[
                          styles.genderButtonText,
                          gender === 'male' && styles.genderButtonTextActive,
                        ]}
                      >
                        Male
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.genderButton,
                        gender === 'female' && styles.genderButtonActive,
                      ]}
                      onPress={() => setGender('female')}
                    >
                      <Ionicons
                        name="female"
                        size={20}
                        color={gender === 'female' ? '#FFFFFF' : COLORS.text}
                      />
                      <Text
                        style={[
                          styles.genderButtonText,
                          gender === 'female' && styles.genderButtonTextActive,
                        ]}
                      >
                        Female
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Fur Color */}
                  <Text style={styles.inputLabel}>Fur Color</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Brown, Black, White"
                    value={furColor}
                    onChangeText={setFurColor}
                  />

                  {/* Weight */}
                  <Text style={styles.inputLabel}>Weight (kg)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 25"
                    value={weight}
                    onChangeText={setWeight}
                    keyboardType="decimal-pad"
                  />

                  {/* Microchip Number */}
                  <Text style={styles.inputLabel}>Microchip Number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="15-digit number"
                    value={microchipNumber}
                    onChangeText={setMicrochipNumber}
                  />

                  {/* Vet Info */}
                  <Text style={styles.sectionTitle}>Emergency Vet Contact</Text>
                  
                  <Text style={styles.inputLabel}>Veterinarian Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Dr. Smith"
                    value={vetName}
                    onChangeText={setVetName}
                  />

                  <Text style={styles.inputLabel}>Vet Phone Number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="+1234567890"
                    value={vetPhone}
                    onChangeText={setVetPhone}
                    keyboardType="phone-pad"
                  />

                  {/* Notes */}
                  <Text style={styles.inputLabel}>Medical Notes</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Allergies, medications, special notes..."
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </>
              )}

              {activeTab === 'vaccinations' && (
                <>
                  <TouchableOpacity
                    style={styles.addVaccinationButton}
                    onPress={() => setVaccinationModalVisible(true)}
                  >
                    <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.addVaccinationButtonText}>Add Vaccination</Text>
                  </TouchableOpacity>

                  {vaccinations.length === 0 ? (
                    <View style={styles.emptyVaccinations}>
                      <Ionicons name="medical-outline" size={48} color={COLORS.textLight} />
                      <Text style={styles.emptyVaccinationsText}>No vaccinations added yet</Text>
                    </View>
                  ) : (
                    vaccinations.map((vac) => (
                      <View key={vac.id} style={styles.vaccinationCard}>
                        <View>
                          <Text style={styles.vaccinationCardName}>{vac.name}</Text>
                          <Text style={styles.vaccinationCardDate}>
                            {new Date(vac.date).toLocaleDateString()}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => {
                            setVaccinations(vaccinations.filter(v => v.id !== vac.id));
                          }}
                        >
                          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                </>
              )}

              {/* Action Buttons */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={savePet}>
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>

              <View style={{ height: 40 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Vaccination Modal */}
      <Modal
        visible={vaccinationModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setVaccinationModalVisible(false)}
      >
        <View style={styles.vaccinationModalOverlay}>
          <View style={styles.vaccinationModalContent}>
            <Text style={styles.vaccinationModalTitle}>Add Vaccination</Text>
            
            <Text style={styles.inputLabel}>Vaccination Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Rabies, Distemper"
              value={vaccinationName}
              onChangeText={setVaccinationName}
            />

            <Text style={styles.inputLabel}>Date</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowVaccinationDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
              <Text style={styles.dateButtonText}>
                {vaccinationDate.toLocaleDateString()}
              </Text>
            </TouchableOpacity>

            {showVaccinationDatePicker && (
              <DateTimePicker
                value={vaccinationDate}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowVaccinationDatePicker(Platform.OS === 'ios');
                  if (selectedDate) setVaccinationDate(selectedDate);
                }}
              />
            )}

            <View style={styles.vaccinationModalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setVaccinationModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={addVaccination}
              >
                <Text style={styles.saveButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: SPACING.xl,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  emergencySection: {
    backgroundColor: '#FFF3F3',
    marginHorizontal: SPACING.xl,
    marginVertical: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: '#FFD6D6',
  },
  emergencySectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  emergencyButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  emergencyButton: {
    flex: 1,
    backgroundColor: '#FF3B30',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: BORDER_RADIUS.md,
    gap: 6,
  },
  emergencyButtonSecondary: {
    backgroundColor: COLORS.primary,
  },
  emergencyButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    marginHorizontal: SPACING.xl,
    marginVertical: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    ...SHADOWS.medium,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    padding: SPACING.xl,
    marginVertical: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  petCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.medium,
    overflow: 'hidden',
  },
  petHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  petPhotoContainer: {
    marginRight: SPACING.md,
  },
  petPhoto: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  petPhotoPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  petInfo: {
    flex: 1,
  },
  petName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  petBreed: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  petAge: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  editButton: {
    padding: 8,
  },
  petDetails: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 14,
    color: COLORS.text,
  },
  vetCallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    padding: 12,
    borderRadius: BORDER_RADIUS.md,
    gap: 8,
  },
  vetCallButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  vaccinationsPreview: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.md,
  },
  vaccinationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  vaccinationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  vaccinationName: {
    fontSize: 14,
    color: COLORS.text,
  },
  vaccinationDate: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  petActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    gap: 6,
  },
  deleteButton: {
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    marginHorizontal: SPACING.xl,
    marginVertical: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  modalCloseButton: {
    position: 'absolute',
    right: SPACING.lg,
    padding: 4,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 3,
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  modalContent: {
    flex: 1,
    padding: SPACING.lg,
  },
  photoPicker: {
    alignSelf: 'center',
    marginBottom: 24,
  },
  photoPreview: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: 12,
    gap: 8,
  },
  dateButtonText: {
    fontSize: 16,
    color: COLORS.text,
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: 12,
    gap: 8,
  },
  genderButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  genderButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  genderButtonTextActive: {
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 24,
    marginBottom: 12,
  },
  addVaccinationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: 16,
    gap: 8,
  },
  addVaccinationButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyVaccinations: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyVaccinationsText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  vaccinationCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  vaccinationCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  vaccinationCardDate: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  saveButton: {
    flex: 1,
    padding: 16,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  vaccinationModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  vaccinationModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: BORDER_RADIUS.lg,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  vaccinationModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  vaccinationModalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
});