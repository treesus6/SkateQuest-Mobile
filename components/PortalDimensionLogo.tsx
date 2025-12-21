import React from 'react';
import { View, Image, TouchableOpacity, Linking, StyleSheet, Text } from 'react-native';

// Portal Dimension - Newport, OR
// Helping each other for the love of skateboarding
const PORTAL_DIMENSION = {
  name: 'Portal Dimension',
  logo: require('../assets/supporters/portal-dimension.png'),
  url: 'https://portaldimension.com',
  instagram: '@portaldimension',
  location: 'Newport, OR',
  founder: 'Kevin Kowalski',
  founded: '2021',
  showNearPark: 'Newport',
};

interface PortalDimensionLogoProps {
  skateparkName?: string;
}

export const PortalDimensionLogo: React.FC<PortalDimensionLogoProps> = ({ skateparkName }) => {
  // Only show near Newport Skatepark
  const parkName = skateparkName?.toLowerCase() || '';
  if (!parkName.includes('newport')) {
    return null;
  }

  const handlePress = async () => {
    try {
      const canOpen = await Linking.canOpenURL(PORTAL_DIMENSION.url);
      if (canOpen) {
        await Linking.openURL(PORTAL_DIMENSION.url);
      } else {
        console.log('Cannot open URL:', PORTAL_DIMENSION.url);
      }
    } catch (error) {
      console.error('Error opening Portal Dimension link:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Community Love 🛹</Text>
      <TouchableOpacity
        onPress={handlePress}
        style={styles.button}
        activeOpacity={0.7}
      >
        <Image
          source={PORTAL_DIMENSION.logo}
          style={styles.logo}
          resizeMode="contain"
        />
      </TouchableOpacity>
      <Text style={styles.location}>{PORTAL_DIMENSION.location}</Text>
      <Text style={styles.vibe}>Helping each other for the love of skateboarding</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 15,
    padding: 15,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  label: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  button: {
    padding: 10,
  },
  logo: {
    width: 150,
    height: 80,
  },
  location: {
    color: '#888',
    fontSize: 12,
    marginTop: 5,
  },
  vibe: {
    color: '#666',
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 3,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
});

export default PortalDimensionLogo;
