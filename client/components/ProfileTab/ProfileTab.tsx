import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Modal, Dimensions, useWindowDimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const ProfileTab: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { logout, user } = useAuth();
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const isSmall = winW < 360;
  const isMedium = winW < 400;
  
  // Calculate bottom padding dynamically based on screen height
  // For taller screens, we need more padding to push buttons to bottom
  // Bottom nav bar is ~64px, safe area bottom varies by device
  const bottomNavHeight = 64;
  const safeAreaBottom = insets.bottom;
  // Calculate padding to position buttons at the very bottom
  // On taller screens, add more padding to account for extra screen space
  const isTallScreen = winH > 800;
  const bottomActionsPaddingBottom = safeAreaBottom + bottomNavHeight + (isTallScreen ? SPACING.LG : SPACING.MD);
  // Use minimal scroll content padding - bottomActions will use marginTop: 'auto' to push to bottom
  const scrollContentPaddingBottom = bottomNavHeight + safeAreaBottom + SPACING.MD;
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedName, setEditedName] = useState(user?.name || '');
  const [editedEmail, setEditedEmail] = useState(user?.email || '');
  const [hasChanges, setHasChanges] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  // Track changes
  useEffect(() => {
    const nameChanged = editedName !== (user?.name || '');
    const emailChanged = editedEmail !== (user?.email || '');
    setHasChanges(nameChanged || emailChanged);
  }, [editedName, editedEmail, user]);

  // Reset form when exiting edit mode
  useEffect(() => {
    if (!isEditMode) {
      setEditedName(user?.name || '');
      setEditedEmail(user?.email || '');
      setHasChanges(false);
    }
  }, [isEditMode, user]);

  const handleEdit = () => {
    setIsEditMode(true);
  };

  const handleCancel = () => {
    setIsEditMode(false);
    setEditedName(user?.name || '');
    setEditedEmail(user?.email || '');
  };

  const handleSave = () => {
    if (!hasChanges) return;
    // TODO: Implement save functionality
    console.log('Saving profile:', { name: editedName, email: editedEmail });
    setIsEditMode(false);
  };

  const handleHomeSettings = () => {
    navigation.navigate('ADD_TO_HOME');
  };

  const handlePrivacySettings = () => {
    console.log('Privacy settings pressed');
    // TODO: Implement privacy settings functionality
  };

  const handleLogout = () => {
    setLogoutModalVisible(true);
  };

  const handleCloseLogoutModal = () => {
    setLogoutModalVisible(false);
  };

  const handleConfirmLogout = async () => {
    try {
      setIsLoggingOut(true);
      setLogoutModalVisible(false);
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
      setIsLoggingOut(false);
    }
  };

  const handleDeleteAccount = () => {
    setDeleteModalVisible(true);
  };

  const handleCloseDeleteModal = () => {
    setDeleteModalVisible(false);
  };

  const handleConfirmDelete = () => {
    // TODO: Implement delete account functionality
    console.log('Delete account confirmed');
    setDeleteModalVisible(false);
  };

  const userInitials = user?.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  return (
    <View style={styles.profileTab}>
      {/* EVA Brand Text - Top Center */}
      <Text style={[styles.evaBrand, { top: insets.top + 20 }]}>EVA</Text>

      {/* Header - Changes based on edit mode */}
      {isEditMode ? (
        <View style={[styles.editHeader, { top: insets.top + 100 }]}>
          <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.editContactTitle}>Edit Contact</Text>
          <TouchableOpacity 
            onPress={handleSave} 
            style={styles.saveButton}
            disabled={!hasChanges}
          >
            <Text style={[styles.saveButtonText, !hasChanges && styles.saveButtonTextDisabled]}>
              Save
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={[styles.profileTitle, { top: insets.top + 100 }]}>Profile</Text>
      )}

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: scrollContentPaddingBottom }
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
        alwaysBounceVertical={false}
        scrollEnabled={false}
      >
        {isEditMode ? (
          /* Edit Mode Content */
          <>
            {/* Profile Container with Picture and Edit Button - Left aligned */}
            <View style={[
              styles.editProfileContainer,
              { marginTop: insets.top + (isSmall ? 120 : 140) },
            ]}>
              <View style={styles.profilePictureWrapper}>
                <View style={styles.profilePictureContainer}>
                  <View style={styles.profileInitials}>
                    <Text style={styles.profileInitialsText}>{userInitials}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.editPictureButton}>
                  <Text style={styles.editPictureButtonText}>Edit</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Name Field - No container */}
            <View style={[styles.editFieldWrapper, { marginTop: SPACING.LG }]}>
              <Text style={styles.fieldLabel}>NAME</Text>
              <View style={styles.fieldSeparator} />
              <TextInput
                style={styles.fieldInput}
                value={editedName}
                onChangeText={setEditedName}
                placeholder="Enter name"
              />
            </View>

            {/* Email Field - No container, with space above */}
            <View style={[styles.editFieldWrapper, { marginTop: SPACING.XL }]}>
              <Text style={styles.fieldLabel}>EMAIL</Text>
              <View style={styles.fieldSeparator} />
              <TextInput
                style={styles.fieldInput}
                value={editedEmail}
                onChangeText={setEditedEmail}
                placeholder="Enter email"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </>
        ) : (
          /* View Mode Content */
          <>
            {/* Profile Container */}
            <View style={[
              styles.profileContainer,
              { marginTop: insets.top + (isSmall ? 120 : 140) },
            ]}>
              {/* Profile Picture */}
              <View style={styles.profilePictureContainer}>
                <View style={styles.profileInitials}>
                  <Text style={styles.profileInitialsText}>{userInitials}</Text>
                </View>
              </View>

              {/* User Info */}
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user?.name || 'User'}</Text>
                <Text style={styles.userEmail}>{user?.email || 'email@example.com'}</Text>
                <Text style={styles.userPhone}>+1 234 567 8900</Text>
              </View>

              {/* Edit Button */}
              <TouchableOpacity onPress={handleEdit} style={styles.editButton}>
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Home Settings Container - Only show in view mode */}
        {!isEditMode && (
          <TouchableOpacity style={styles.homeSettingsContainer} onPress={handleHomeSettings} activeOpacity={0.7}>
            <View style={styles.homeSettingsLeft}>
              <View style={styles.homeIconContainer}>
                <MaterialCommunityIcons name="home-variant" size={20} color={COLORS.TEXT_PRIMARY} />
              </View>
              <View style={styles.homeSettingsTextContainer}>
                <Text style={styles.homeSettingsTitle}>Add to your home</Text>
                <Text style={styles.homeSettingsSubtitle}>Get notified when members come and go</Text>
              </View>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.TEXT_SECONDARY} />
          </TouchableOpacity>
        )}

        {/* Privacy and Security Container - Only show in view mode */}
        {!isEditMode && (
          <TouchableOpacity style={styles.privacyContainer} onPress={handlePrivacySettings} activeOpacity={0.7}>
            <View style={styles.privacyLeft}>
              <View style={styles.exclamationIconContainer}>
                <MaterialCommunityIcons name="exclamation" size={20} color={COLORS.TEXT_PRIMARY} />
              </View>
              <View style={styles.privacyTextContainer}>
                <Text style={styles.privacyTitle}>Privacy and Security</Text>
                <Text style={styles.privacySubtitle}>Data protection</Text>
              </View>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.TEXT_SECONDARY} />
          </TouchableOpacity>
        )}

        {/* Bottom Actions - Only show in view mode */}
        {!isEditMode && (
          <View style={[
            styles.bottomActions,
            isSmall && styles.bottomActionsSmall,
            { paddingBottom: bottomActionsPaddingBottom, marginTop: 'auto' }
          ]}>
            {/* Delete Account Button */}
            <TouchableOpacity style={styles.deleteAccountButton} onPress={handleDeleteAccount} activeOpacity={0.7}>
              <MaterialCommunityIcons name="trash-can-outline" size={20} color={COLORS.TEXT_SECONDARY} />
              <Text style={styles.deleteAccountText}>Delete Account</Text>
            </TouchableOpacity>

            {/* Logout Button */}
            <TouchableOpacity 
              style={styles.logoutButton} 
              onPress={handleLogout} 
              disabled={isLoggingOut}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="logout" size={20} color={COLORS.ERROR} />
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Delete Account Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseDeleteModal}
        statusBarTranslucent
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleCloseDeleteModal}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              {/* Title */}
              <Text style={styles.modalTitle}>Delete account</Text>

              {/* Subtitle */}
              <Text style={styles.modalSubtitle}>Are you sure you want to delete your account?</Text>

              {/* Horizontal Line */}
              <View style={styles.modalSeparator} />

              {/* Yes Delete Button */}
              <TouchableOpacity
                style={styles.modalDeleteButton}
                onPress={handleConfirmDelete}
                activeOpacity={0.7}
              >
                <Text style={styles.modalDeleteButtonText}>Yes delete</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Logout Modal */}
      <Modal
        visible={logoutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseLogoutModal}
        statusBarTranslucent
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleCloseLogoutModal}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              {/* Title */}
              <Text style={styles.modalTitle}>Log out</Text>

              {/* Subtitle */}
              <Text style={styles.modalSubtitle}>Are you sure you want to log out?</Text>

              {/* Horizontal Line */}
              <View style={styles.modalSeparator} />

              {/* Yes Logout Button */}
              <TouchableOpacity
                style={styles.modalLogoutButton}
                onPress={handleConfirmLogout}
                activeOpacity={0.7}
              >
                <Text style={styles.modalLogoutButtonText}>Yes log out</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  profileTab: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND_WHITE,
    paddingHorizontal: SPACING.MD,
    paddingTop: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    // paddingBottom is now set dynamically based on screen height
    // flexGrow ensures bottomActions can use marginTop: 'auto' to push to bottom
  },
  evaBrand: {
    position: 'absolute',
    left: 0,
    right: 0,
    fontSize: 48,
    fontWeight: '700',
    color: '#4B5563',
    letterSpacing: 2,
    textAlign: 'center',
    fontFamily: 'Helvetica',
    zIndex: 1,
  },
  profileTitle: {
    position: 'absolute',
    left: SPACING.MD,
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    zIndex: 1,
  },
  editHeader: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.MD,
    zIndex: 1,
  },
  cancelButton: {
    paddingVertical: SPACING.SM,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF', // Blue color
  },
  editContactTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
    textAlign: 'center',
  },
  saveButton: {
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.SM,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF', // Blue color when active
  },
  saveButtonTextDisabled: {
    color: COLORS.TEXT_SECONDARY,
    opacity: 0.5,
  },
  editProfileContainer: {
    alignItems: 'flex-start',
    backgroundColor: COLORS.BACKGROUND_WHITE,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EBEBEB',
    padding: SPACING.MD,
    marginBottom: SPACING.MD,
  },
  profilePictureWrapper: {
    alignItems: 'flex-start',
  },
  editPictureButton: {
    marginTop: SPACING.MD,
    marginLeft: 10,
    paddingVertical: SPACING.SM,
    paddingHorizontal: 0,
    alignSelf: 'flex-start',
  },
  editPictureButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF', // Blue color
  },
  editFieldWrapper: {
    width: '100%',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#636366',
    textTransform: 'uppercase',
    marginBottom: SPACING.SM,
  },
  fieldSeparator: {
    height: 1,
    backgroundColor: COLORS.BORDER_LIGHT,
    width: '100%',
    marginBottom: SPACING.MD,
  },
  fieldInput: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.TEXT_PRIMARY,
    padding: 0,
    width: '100%',
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND_WHITE,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EBEBEB',
    padding: SPACING.MD,
    marginTop: 100,
    marginBottom: SPACING.MD,
  },
  profilePictureContainer: {
    marginRight: SPACING.MD,
  },
  profileInitials: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitialsText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.BACKGROUND_WHITE,
  },
  userInfo: {
    flex: 1,
    marginRight: SPACING.MD,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 10,
    fontWeight: '400',
    color: '#a4a4a4',
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 10,
    fontWeight: '400',
    color: '#a4a4a4',
  },
  editButton: {
    paddingHorizontal: SPACING.SM,
  },
  editButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  homeSettingsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.BACKGROUND_WHITE,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EBEBEB',
    padding: SPACING.MD,
    marginBottom: SPACING.MD,
  },
  homeSettingsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: SPACING.MD,
  },
  homeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EBEBEB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.MD,
  },
  homeSettingsTextContainer: {
    flex: 1,
  },
  homeSettingsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 2,
  },
  homeSettingsSubtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.TEXT_SECONDARY,
    flexWrap: 'wrap',
  },
  privacyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.BACKGROUND_WHITE,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EBEBEB',
    padding: SPACING.MD,
    marginBottom: SPACING.MD,
  },
  privacyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: SPACING.MD,
  },
  exclamationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.BACKGROUND_GRAY,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.MD,
  },
  privacyTextContainer: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 2,
  },
  privacySubtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.TEXT_SECONDARY,
    flexWrap: 'wrap',
  },
  bottomActions: {
    marginTop: 'auto',
    paddingTop: SPACING.XL * 4,
    // paddingBottom is now set dynamically based on screen height and safe area
  },
  bottomActionsSmall: {
    paddingTop: SPACING.XL * 3,
    // paddingBottom is now set dynamically based on screen height and safe area
  },
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.MD,
    marginBottom: SPACING.MD,
    borderRadius: BORDER_RADIUS.XL,
    borderWidth: 1,
    borderColor: COLORS.BORDER_LIGHT,
    backgroundColor: COLORS.BACKGROUND_WHITE,
  },
  deleteAccountText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.TEXT_SECONDARY,
    marginLeft: SPACING.SM,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: COLORS.BACKGROUND_WHITE,
    borderRadius: BORDER_RADIUS.XL,
    borderWidth: 1,
    borderColor: '#EBEBEB',
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.MD,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.ERROR,
    marginLeft: SPACING.SM,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width - 80,
    maxWidth: 320,
  },
  modalContent: {
    borderRadius: BORDER_RADIUS.MD,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.BORDER_WHITE,
    backgroundColor: '#F2F2F2',
    ...SHADOWS.LG,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.MD,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.TEXT_SECONDARY,
    paddingHorizontal: SPACING.MD,
    paddingBottom: SPACING.MD,
    textAlign: 'center',
  },
  modalSeparator: {
    height: 1,
    backgroundColor: COLORS.BORDER_OPACITY,
    marginHorizontal: SPACING.SM,
  },
  modalDeleteButton: {
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.MD,
    alignItems: 'center',
  },
  modalDeleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF', // System blue color
  },
  modalLogoutButton: {
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.MD,
    alignItems: 'center',
  },
  modalLogoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF', // System blue color
  },
});

