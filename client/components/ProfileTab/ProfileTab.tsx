import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';

export const ProfileTab: React.FC = () => {
  const { logout, user } = useAuth();
  const insets = useSafeAreaInsets();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedName, setEditedName] = useState(user?.name || '');
  const [editedEmail, setEditedEmail] = useState(user?.email || '');
  const [hasChanges, setHasChanges] = useState(false);

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
    console.log('Home settings pressed');
    // TODO: Implement home settings functionality
  };

  const handlePrivacySettings = () => {
    console.log('Privacy settings pressed');
    // TODO: Implement privacy settings functionality
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
      setIsLoggingOut(false);
    }
  };

  const handleDeleteAccount = () => {
    console.log('Delete account pressed');
    // TODO: Implement delete account functionality
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
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isEditMode ? (
          /* Edit Mode Content */
          <>
            {/* Profile Container with Picture and Edit Button - Left aligned */}
            <View style={[styles.editProfileContainer, { marginTop: insets.top + 140 }]}>
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
            <View style={[styles.profileContainer, { marginTop: insets.top + 140 }]}>
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
          <View style={styles.bottomActions}>
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
              <Text style={styles.logoutText}>{isLoggingOut ? 'Logging Out...' : 'Log Out'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
    paddingBottom: 300, // More space to push buttons to bottom
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
    paddingBottom: SPACING.XL * 5,
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
});

