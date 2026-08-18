import React from 'react';
import { Pressable, SafeAreaView, Text, View } from 'react-native';
import { Camera, Film, WifiOff } from 'lucide-react-native';
import { useNavigation } from '../lib/useNavigation';

export default function GoProImportScreen() {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#07090D' }}>
      <View
        style={{
          flex: 1,
          padding: 24,
          justifyContent: 'center',
          width: '100%',
          maxWidth: 620,
          alignSelf: 'center',
        }}
      >
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <WifiOff color="#D2673D" size={52} />
          <Text
            style={{
              color: 'white',
              fontSize: 28,
              fontWeight: '900',
              textAlign: 'center',
              marginTop: 14,
            }}
          >
            GoPro clips on web
          </Text>
          <Text
            style={{
              color: '#AAB1BC',
              fontSize: 15,
              lineHeight: 22,
              textAlign: 'center',
              marginTop: 10,
            }}
          >
            Safari and Chrome block a secure SkateQuest page from directly talking to the GoPro's
            local HTTP camera server. Use the GoPro app or your phone's file transfer to save the
            clip first, then upload the real file here.
          </Text>
        </View>

        <View
          style={{
            backgroundColor: '#10151D',
            borderRadius: 18,
            padding: 18,
            borderWidth: 1,
            borderColor: '#2A3340',
            marginBottom: 18,
          }}
        >
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 12 }}>
            <Camera color="#D2673D" size={22} />
            <Text style={{ color: 'white', fontWeight: '800', flex: 1 }}>
              1. Save the GoPro clip to your phone
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <Film color="#D2673D" size={22} />
            <Text style={{ color: 'white', fontWeight: '800', flex: 1 }}>
              2. Pick that clip in SkateQuest and upload it
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => navigation.navigate('UploadMedia')}
          style={{
            minHeight: 54,
            borderRadius: 14,
            backgroundColor: '#D2673D',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: 'white', fontWeight: '900', fontSize: 16 }}>
            Choose GoPro Clip
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
