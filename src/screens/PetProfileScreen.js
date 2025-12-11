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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useUser } from '../context/UserContext';
import { useInterstitialAd } from '../hooks/useInterstitialAd';
import AdBanner from '../components/AdBanner';
import { savePetProfile, getPetProfile, deletePetProfile } from '../services/storageService';
import { COLORS, FONTS, SPACING, SHADOWS, BORDER_RADIUS } from '../constants/theme';

export default function PetProfileScreen({ navigation }) {
  useInterstitialAd(navigation);
  const { user } = useUser();

  const [pets, setPets] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'appointments' | 'documents'
  
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
          <Text style={styles.title}>🐾 Tierausweis</Text>
          <Text style={styles.subtitle}>My Pet Profiles</Text>
        </View>

        {/* Add Pet Button */}
        <TouchableOpacity style={styles.addButton} onPress={openAddPetModal}>
          <Ionicons name="add-circle" size={24} color="#FFFFFF" />
          <Text style={styles.addButtonText}>+ Profil anlegen</Text>
        </TouchableOpacity>

        {/* Pet List */}
        {pets.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="paw" size={60} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyTitle}>Noch kein Profil hinterlegt</Text>
            <Text style={styles.emptyText}>
              Lege die wichtigsten Daten deines Hundes an, um den Tierausweis zu vervollständigen.
            </Text>
          </View>
        ) : (
          pets.map((pet) => (
            <View key={pet.id} style={styles.petCard}>
              {/* Pet Header */}
              <TouchableOpacity
                style={styles.petHeader}
                onPress={() => openEditPetModal(pet)}
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
                    {calculateAge(pet.birthDate)} • {pet.gender === 'male' ? '♂' : '♀'}
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
                    <Text style={styles.detailLabel}>Fellfarbe:</Text>
                    <Text style={styles.detailValue}>{pet.furColor}</Text>
                  </View>
                )}
                {pet.weight && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Gewicht:</Text>
                    <Text style={styles.detailValue}>{pet.weight} kg</Text>
                  </View>
                )}
                {pet.microchipNumber && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Chip-Nr:</Text>
                    <Text style={styles.detailValue}>{pet.microchipNumber}</Text>
                  </View>
                )}
                {pet.vetName && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Tierarzt:</Text>
                    <Text style={styles.detailValue}>{pet.vetName}</Text>
                  </View>
                )}
              </View>

              {/* Actions */}
              <View style={styles.petActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => openEditPetModal(pet)}
                >
                  <Ionicons name="create-outline" size={20} color={COLORS.primary} />
                  <Text style={styles.actionButtonText}>Bearbeiten</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => deletePet(pet.id)}
                >
                  <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                  <Text style={[styles.actionButtonText, { color: '#FF3B30' }]}>
                    Löschen
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
            Store all your pet's important information in one place. Add vaccination records, 
            vet appointments, and important documents.
          </Text>
        </View>
      </ScrollView>

      {/* AdMob Banner */}
      <AdBanner />

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
                {editingPet ? 'Tierprofil bearbeiten' : 'Tierprofil bearbeiten'}
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Photo Picker */}
              <TouchableOpacity style={styles.photoPicker} onPress={pickImage}>
                {petPhoto ? (
                  <Image source={{ uri: petPhoto }} style={styles.photoPreview} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Ionicons name="camera" size={32} color={COLORS.textLight} />
                    <Text style={styles.photoPlaceholderText}>Foto hinzufügen</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Name */}
              <Text style={styles.inputLabel}>Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Name *"
                value={petName}
                onChangeText={setPetName}
              />

              {/* Breed */}
              <Text style={styles.inputLabel}>Rasse</Text>
              <TextInput
                style={styles.input}
                placeholder="Rasse"
                value={breed}
                onChangeText={setBreed}
              />

              {/* Birth Date */}
              <Text style={styles.inputLabel}>Geburtsdatum wählen</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
                <Text style={styles.dateButtonText}>
                  {birthDate.toLocaleDateString('de-DE')}
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
              <Text style={styles.inputLabel}>Geschlecht</Text>
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
                    Männlich
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
                    Weiblich
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Fur Color */}
              <Text style={styles.inputLabel}>Fellfarbe</Text>
              <TextInput
                style={styles.input}
                placeholder="Fellfarbe"
                value={furColor}
                onChangeText={setFurColor}
              />

              {/* Weight */}
              <Text style={styles.inputLabel}>Gewicht (kg)</Text>
              <TextInput
                style={styles.input}
                placeholder="Gewicht (kg)"
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
              />

              {/* Microchip Number */}
              <Text style={styles.inputLabel}>Chip-Nummer</Text>
              <TextInput
                style={styles.input}
                placeholder="Chip-Nummer"
                value={microchipNumber}
                onChangeText={setMicrochipNumber}
              />

              {/* Vet Info */}
              <Text style={styles.sectionTitle}>Tierarzt Informationen</Text>
              
              <Text style={styles.inputLabel}>Tierarzt Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Tierarzt Name"
                value={vetName}
                onChangeText={setVetName}
              />

              <Text style={styles.inputLabel}>Tierarzt Telefon</Text>
              <TextInput
                style={styles.input}
                placeholder="Tierarzt Telefon"
                value={vetPhone}
                onChangeText={setVetPhone}
                keyboardType="phone-pad"
              />

              {/* Notes */}
              <Text style={styles.inputLabel}>Notizen</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Allergien, Medikamente, besondere Hinweise..."
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              {/* Action Buttons */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Abbrechen</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={savePet}>
                  <Text style={styles.saveButtonText}>Speichern</Text>
                </TouchableOpacity>
              </View>

              <View style={{ height: 40 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
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
});
