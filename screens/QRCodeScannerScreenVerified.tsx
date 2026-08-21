import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Crosshair,
  MapPin,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Upload,
  Video,
} from 'lucide-react-native';
import { useNavigation } from '../lib/useNavigation';
import { getCurrentLocation } from '../lib/currentLocation';
import { supabase } from '../lib/supabase';
import { pickVideo, uploadVideo } from '../lib/mediaUpload';
import { useAuthStore } from '../stores/useAuthStore';

const INK = '#07080B';
const PAPER = '#F6F0E5';
const ORANGE = '#E36D3F';
const ACID = '#D9F34A';
const BLUE = '#72A9FF';
const MUTED = '#98A0AC';

type PendingClaim = {
  qrId: string;
  trick: string;
  message?: string | null;
  xpReward: number;
};

export default function QRCodeScannerScreenVerified() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [locationReady, setLocationReady] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [claim, setClaim] = useState<PendingClaim | null>(null);
  const [uploading, setUploading] = useState(false);

  const checkLocation = async () => {
    setLocationError(null);
    try {
      await getCurrentLocation();
      setLocationReady(true);
    } catch (error) {
      setLocationReady(false);
      setLocationError(error instanceof Error ? error.message : 'Location is unavailable.');
    }
  };

  useEffect(() => {
    void checkLocation();
  }, []);

  const handleScan = async ({ data }: { data: string }) => {
    if (scanned || processing) return;
    if (!user) {
      Alert.alert('Login required', 'Sign in before joining a QR Hunt.');
      return;
    }
    setScanned(true);
    setProcessing(true);
    try {
      const loc = await getCurrentLocation();
      const { data: result, error } = await supabase.rpc('claim_hidden_qr', {
        p_code: data,
        p_latitude: loc.latitude,
        p_longitude: loc.longitude,
        p_spot_id: null,
      });
      if (error) throw error;
      const row = (result || {}) as any;
      if (!row?.qr_id || !row?.trick_challenge) throw new Error('This QR is missing its required trick.');
      setClaim({
        qrId: String(row.qr_id),
        trick: String(row.trick_challenge),
        message: row.challenge_message || null,
        xpReward: Number(row.xp_reward || 50),
      });
    } catch (error: any) {
      Alert.alert('Could not verify QR', error?.message || 'This code could not be verified.', [
        { text: 'Scan again', onPress: () => setScanned(false) },
      ]);
    } finally {
      setProcessing(false);
    }
  };

  const submitProof = async (useCamera: boolean) => {
    if (!claim || !user) return;
    setUploading(true);
    try {
      const asset = await pickVideo(useCamera);
      if (!asset) return;
      const uploaded = await uploadVideo(asset.uri, 'qr_proofs', user.id, asset.duration || undefined);
      if (!uploaded.url) throw new Error('Video upload did not return a URL.');
      const { error } = await supabase.rpc('submit_hidden_qr_trick_proof', {
        p_qr_id: claim.qrId,
        p_proof_url: uploaded.url,
      });
      if (error) throw error;
      Alert.alert(
        'Trick proof sent',
        `${claim.trick} is waiting for the hider to review. No XP is awarded until they approve the clip.`,
        [{ text: 'Done', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      Alert.alert('Could not submit proof', error?.message || 'Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (!permission) {
    return (
      <GateScreen
        icon={<Camera color={INK} size={30} strokeWidth={2.7} />}
        kicker="QR HUNT // CAMERA"
        title={'WAKING UP\nTHE LENS.'}
        body="SkateQuest is checking camera access before the hunt opens."
        loading
        onBack={() => navigation.goBack()}
      />
    );
  }

  if (!permission.granted) {
    return (
      <GateScreen
        icon={<Camera color={INK} size={30} strokeWidth={2.7} />}
        kicker="QR HUNT // CAMERA"
        title={'CAMERA\nREQUIRED.'}
        body="Camera access is required to scan a physical SkateQuest QR."
        primaryLabel="ALLOW CAMERA"
        onPrimary={() => void requestPermission()}
        onBack={() => navigation.goBack()}
      />
    );
  }

  if (!locationReady) {
    return (
      <GateScreen
        icon={<MapPin color={INK} size={30} strokeWidth={2.7} />}
        kicker="QR HUNT // GPS"
        title={'PROVE THE\nHIDING POINT.'}
        body={locationError || 'Checking your real-world location…'}
        primaryLabel="TRY LOCATION AGAIN"
        onPrimary={() => void checkLocation()}
        onBack={() => navigation.goBack()}
      />
    );
  }

  if (claim) {
    return (
      <SafeAreaView style={s.claimPage} edges={['top', 'bottom']}>
        <View pointerEvents="none" style={s.claimTexture}>
          <View style={s.claimSlashOrange} />
          <View style={s.claimSlashAcid} />
          <View style={s.claimOrb} />
        </View>

        <View style={s.claimHeader}>
          <Pressable style={s.iconButton} onPress={() => navigation.goBack()} accessibilityLabel="Go back">
            <ArrowLeft color={PAPER} size={20} strokeWidth={2.8} />
          </Pressable>
          <View style={s.verifiedPill}>
            <ShieldCheck color={ACID} size={15} />
            <Text style={s.verifiedPillText}>QR VERIFIED</Text>
          </View>
        </View>

        <View style={s.claimHero}>
          <Text style={s.claimKicker}>FOUND // NOW EARN IT</Text>
          <Text style={s.claimTitle}>LAND THE{`\n`}TRICK.</Text>
          <Text style={s.claimSub}>The scan only unlocks the challenge. The clip still has to prove it.</Text>
        </View>

        <View style={s.trickTicket}>
          <View style={s.ticketRail}>
            <Text style={s.ticketIndex}>01</Text>
            <Crosshair color={INK} size={24} strokeWidth={2.9} />
          </View>
          <View style={s.ticketBody}>
            <Text style={s.ticketLabel}>YOUR TRICK</Text>
            <Text style={s.trickName}>{claim.trick}</Text>
            {claim.message ? <Text style={s.hiderMessage}>“{claim.message}”</Text> : null}
            <View style={s.rewardRow}>
              <View>
                <Text style={s.rewardValue}>+{claim.xpReward}</Text>
                <Text style={s.rewardLabel}>XP AFTER APPROVAL</Text>
              </View>
              <View style={s.proofBadge}>
                <Video color={INK} size={16} />
                <Text style={s.proofBadgeText}>VIDEO PROOF</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={s.claimActions}>
          <Pressable
            style={[s.primaryAction, uploading && s.disabled]}
            onPress={() => void submitProof(true)}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color={INK} />
            ) : (
              <>
                <View style={s.primaryActionIcon}><Camera color={INK} size={19} strokeWidth={2.8} /></View>
                <Text style={s.primaryActionText}>RECORD TRICK PROOF</Text>
                <ArrowRight color={INK} size={18} strokeWidth={3} />
              </>
            )}
          </Pressable>

          <Pressable
            style={[s.secondaryAction, uploading && s.disabled]}
            onPress={() => void submitProof(false)}
            disabled={uploading}
          >
            <Upload color={PAPER} size={18} />
            <Text style={s.secondaryActionText}>CHOOSE EXISTING CLIP</Text>
          </Pressable>

          <Pressable style={s.leaveAction} onPress={() => navigation.goBack()}>
            <Text style={s.leaveActionText}>Leave without claiming</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={s.cameraPage}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleScan}
      />
      <View style={s.cameraShade} />

      <SafeAreaView style={s.cameraHud} edges={['top', 'bottom']}>
        <View style={s.cameraTopbar}>
          <Pressable style={s.cameraBack} onPress={() => navigation.goBack()} accessibilityLabel="Cancel QR scan">
            <ArrowLeft color={PAPER} size={20} strokeWidth={2.8} />
          </Pressable>
          <View style={s.cameraStatus}>
            <View style={s.cameraStatusDot} />
            <Text style={s.cameraStatusText}>GPS LOCKED</Text>
          </View>
          <Pressable style={s.hideButton} onPress={() => navigation.navigate('HideQRCode')}>
            <Text style={s.hideButtonText}>HIDE ONE</Text>
            <ArrowRight color={INK} size={14} strokeWidth={3} />
          </Pressable>
        </View>

        <View style={s.scanIntro}>
          <View style={s.scanKickerRow}>
            <ScanLine color={ORANGE} size={15} />
            <Text style={s.scanKicker}>QR HUNT // LIVE</Text>
          </View>
          <Text style={s.scanTitle}>FIND IT.{`\n`}SCAN IT.{`\n`}LAND IT.</Text>
          <Text style={s.scanSub}>The scan only counts at the real hiding point.</Text>
        </View>

        <View style={s.scannerZone} pointerEvents="none">
          <View style={s.scanFrame}>
            <View style={[s.corner, s.cornerTL]} />
            <View style={[s.corner, s.cornerTR]} />
            <View style={[s.corner, s.cornerBL]} />
            <View style={[s.corner, s.cornerBR]} />
            <View style={s.scanLine} />
            <View style={s.scanCenterMark}>
              <Crosshair color={ACID} size={20} strokeWidth={2.5} />
            </View>
          </View>
        </View>

        <View style={s.cameraBottom}>
          <View style={s.cameraInstruction}>
            {processing ? <ActivityIndicator color={INK} /> : <Sparkles color={INK} size={18} />}
            <View style={s.cameraInstructionCopy}>
              <Text style={s.cameraInstructionTitle}>{processing ? 'VERIFYING HUNT…' : 'LINE UP THE QR'}</Text>
              <Text style={s.cameraInstructionSub}>{processing ? 'Checking code + GPS.' : 'Keep the physical code inside the frame.'}</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function GateScreen({
  icon,
  kicker,
  title,
  body,
  primaryLabel,
  onPrimary,
  onBack,
  loading = false,
}: {
  icon: React.ReactNode;
  kicker: string;
  title: string;
  body: string;
  primaryLabel?: string;
  onPrimary?: () => void;
  onBack: () => void;
  loading?: boolean;
}) {
  return (
    <SafeAreaView style={s.gatePage} edges={['top', 'bottom']}>
      <View pointerEvents="none" style={s.gateTexture}>
        <View style={s.gateSlashOrange} />
        <View style={s.gateSlashAcid} />
        <View style={s.gateOrb} />
      </View>

      <View style={s.gateHeader}>
        <Pressable style={s.iconButton} onPress={onBack} accessibilityLabel="Go back">
          <ArrowLeft color={PAPER} size={20} strokeWidth={2.8} />
        </Pressable>
        <Text style={s.gateBrand}>SKATEQUEST</Text>
      </View>

      <View style={s.gateCard}>
        <View style={s.gateIcon}>{icon}</View>
        <Text style={s.gateKicker}>{kicker}</Text>
        <Text style={s.gateTitle}>{title}</Text>
        <Text style={s.gateBody}>{body}</Text>

        {loading ? (
          <View style={s.gateLoading}>
            <ActivityIndicator color={INK} />
            <Text style={s.gateLoadingText}>CHECKING ACCESS</Text>
          </View>
        ) : primaryLabel && onPrimary ? (
          <Pressable style={s.gatePrimary} onPress={onPrimary}>
            <Text style={s.gatePrimaryText}>{primaryLabel}</Text>
            <View style={s.gatePrimaryArrow}><ArrowRight color={INK} size={18} strokeWidth={3} /></View>
          </Pressable>
        ) : null}

        <Pressable style={s.gateBackLink} onPress={onBack}>
          <Text style={s.gateBackText}>Go back</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  cameraPage: { flex: 1, backgroundColor: INK },
  cameraShade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(3,4,6,0.31)' },
  cameraHud: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 16 },
  cameraTopbar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 8 },
  cameraBack: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(7,8,11,0.76)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  cameraStatus: { flex: 1, minHeight: 37, borderRadius: 999, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(7,8,11,0.75)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  cameraStatusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: ACID },
  cameraStatusText: { color: PAPER, fontSize: 8, fontWeight: '900', letterSpacing: 1.1 },
  hideButton: { minHeight: 40, borderRadius: 12, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: ACID, borderWidth: 2, borderColor: INK },
  hideButtonText: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  scanIntro: { paddingTop: 12 },
  scanKickerRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  scanKicker: { color: ORANGE, fontSize: 9, fontWeight: '900', letterSpacing: 1.7 },
  scanTitle: { color: PAPER, fontSize: 43, lineHeight: 38, fontWeight: '900', letterSpacing: -2.4, marginTop: 7, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 8 },
  scanSub: { color: '#D3D7DD', fontSize: 12, lineHeight: 17, fontWeight: '700', maxWidth: 290, marginTop: 8, textShadowColor: 'rgba(0,0,0,0.75)', textShadowRadius: 6 },
  scannerZone: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  scanFrame: { width: 252, height: 252, borderRadius: 28, backgroundColor: 'rgba(0,0,0,0.08)', position: 'relative' },
  corner: { position: 'absolute', width: 56, height: 56, borderColor: ACID },
  cornerTL: { top: 0, left: 0, borderTopWidth: 5, borderLeftWidth: 5, borderTopLeftRadius: 24 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 5, borderRightWidth: 5, borderTopRightRadius: 24 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 5, borderLeftWidth: 5, borderBottomLeftRadius: 24 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 5, borderRightWidth: 5, borderBottomRightRadius: 24 },
  scanLine: { position: 'absolute', left: 21, right: 21, top: '50%', height: 2, backgroundColor: ORANGE, shadowColor: ORANGE, shadowOpacity: 0.9, shadowRadius: 9 },
  scanCenterMark: { position: 'absolute', width: 48, height: 48, borderRadius: 16, left: '50%', top: '50%', marginLeft: -24, marginTop: -24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(7,8,11,0.7)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  cameraBottom: { paddingBottom: 8 },
  cameraInstruction: { minHeight: 72, borderRadius: 20, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: PAPER, borderWidth: 2, borderColor: INK },
  cameraInstructionCopy: { flex: 1 },
  cameraInstructionTitle: { color: INK, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  cameraInstructionSub: { color: '#646963', fontSize: 10, fontWeight: '700', marginTop: 3 },

  gatePage: { flex: 1, backgroundColor: INK, paddingHorizontal: 16 },
  gateTexture: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden' },
  gateSlashOrange: { position: 'absolute', width: 430, height: 92, backgroundColor: ORANGE, right: -175, top: 130, transform: [{ rotate: '29deg' }], opacity: 0.88 },
  gateSlashAcid: { position: 'absolute', width: 360, height: 34, backgroundColor: ACID, left: -155, bottom: 110, transform: [{ rotate: '-12deg' }] },
  gateOrb: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: BLUE, opacity: 0.11, right: -48, bottom: 32 },
  gateHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 },
  iconButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#11151B', borderWidth: 1, borderColor: '#303641', alignItems: 'center', justifyContent: 'center' },
  gateBrand: { color: PAPER, fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  gateCard: { marginTop: 'auto', marginBottom: 'auto', borderRadius: 28, padding: 20, backgroundColor: PAPER, borderWidth: 2, borderColor: INK },
  gateIcon: { width: 68, height: 68, borderRadius: 20, backgroundColor: ACID, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] },
  gateKicker: { color: ORANGE, fontSize: 9, fontWeight: '900', letterSpacing: 1.7, marginTop: 22 },
  gateTitle: { color: INK, fontSize: 38, lineHeight: 34, fontWeight: '900', letterSpacing: -2, marginTop: 4 },
  gateBody: { color: '#646963', fontSize: 13, lineHeight: 19, fontWeight: '700', marginTop: 11 },
  gateLoading: { minHeight: 54, borderRadius: 15, backgroundColor: ACID, borderWidth: 2, borderColor: INK, marginTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  gateLoadingText: { color: INK, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  gatePrimary: { minHeight: 55, borderRadius: 15, backgroundColor: ACID, borderWidth: 2, borderColor: INK, marginTop: 20, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gatePrimaryText: { color: INK, fontSize: 11, fontWeight: '900', letterSpacing: 0.7 },
  gatePrimaryArrow: { width: 34, height: 34, borderRadius: 11, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' },
  gateBackLink: { alignItems: 'center', paddingVertical: 14 },
  gateBackText: { color: '#777066', fontSize: 11, fontWeight: '800' },

  claimPage: { flex: 1, backgroundColor: INK, paddingHorizontal: 16 },
  claimTexture: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden' },
  claimSlashOrange: { position: 'absolute', width: 440, height: 95, backgroundColor: ORANGE, right: -190, top: 135, transform: [{ rotate: '31deg' }], opacity: 0.86 },
  claimSlashAcid: { position: 'absolute', width: 360, height: 34, backgroundColor: ACID, left: -145, bottom: 145, transform: [{ rotate: '-12deg' }] },
  claimOrb: { position: 'absolute', width: 190, height: 190, borderRadius: 95, backgroundColor: BLUE, opacity: 0.12, right: -65, bottom: 35 },
  claimHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 },
  verifiedPill: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 35, paddingHorizontal: 10, borderRadius: 999, backgroundColor: '#11151B', borderWidth: 1, borderColor: '#303641' },
  verifiedPillText: { color: PAPER, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  claimHero: { paddingTop: 24 },
  claimKicker: { color: ORANGE, fontSize: 9, fontWeight: '900', letterSpacing: 1.7 },
  claimTitle: { color: PAPER, fontSize: 45, lineHeight: 40, fontWeight: '900', letterSpacing: -2.5, marginTop: 5 },
  claimSub: { color: MUTED, fontSize: 12, lineHeight: 18, fontWeight: '700', maxWidth: 320, marginTop: 9 },
  trickTicket: { flexDirection: 'row', marginTop: 20, borderRadius: 23, backgroundColor: PAPER, borderWidth: 2, borderColor: INK, overflow: 'hidden' },
  ticketRail: { width: 68, paddingVertical: 16, alignItems: 'center', justifyContent: 'space-between', backgroundColor: ORANGE },
  ticketIndex: { color: INK, fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  ticketBody: { flex: 1, padding: 17 },
  ticketLabel: { color: ORANGE, fontSize: 8, fontWeight: '900', letterSpacing: 1.4 },
  trickName: { color: INK, fontSize: 29, lineHeight: 31, fontWeight: '900', letterSpacing: -1.1, marginTop: 4 },
  hiderMessage: { color: '#666C75', fontSize: 12, lineHeight: 18, fontWeight: '700', marginTop: 9 },
  rewardRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10, marginTop: 16 },
  rewardValue: { color: INK, fontSize: 22, fontWeight: '900' },
  rewardLabel: { color: '#777066', fontSize: 7, fontWeight: '900', letterSpacing: 0.8 },
  proofBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, minHeight: 30, borderRadius: 10, backgroundColor: ACID },
  proofBadgeText: { color: INK, fontSize: 7, fontWeight: '900', letterSpacing: 0.7 },
  claimActions: { marginTop: 'auto', paddingBottom: 8 },
  primaryAction: { minHeight: 58, borderRadius: 16, backgroundColor: ACID, borderWidth: 2, borderColor: INK, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  primaryActionIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' },
  primaryActionText: { flex: 1, color: INK, fontSize: 11, fontWeight: '900', letterSpacing: 0.7 },
  secondaryAction: { minHeight: 52, borderRadius: 15, backgroundColor: '#12161D', borderWidth: 1, borderColor: '#303641', marginTop: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secondaryActionText: { color: PAPER, fontSize: 10, fontWeight: '900', letterSpacing: 0.7 },
  leaveAction: { alignItems: 'center', paddingVertical: 13 },
  leaveActionText: { color: MUTED, fontSize: 10, fontWeight: '800' },
  disabled: { opacity: 0.5 },
});