import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import Svg, { Circle, Path } from 'react-native-svg';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  CreditCard,
  Crosshair,
  HeartHandshake,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
} from 'lucide-react-native';
import { useNavigation } from '../lib/useNavigation';
import { getCurrentLocation } from '../lib/currentLocation';
import { supabase } from '../lib/supabase';
import { SkateEvents } from '../lib/analytics';
import QRTrickReviewPanel from '../components/QRTrickReviewPanel';
import QRSupportFundCard from '../components/QRSupportFundCard';

const INK = '#07080B';
const PAPER = '#F6F0E5';
const ORANGE = '#E36D3F';
const ACID = '#D9F34A';
const BLUE = '#72A9FF';
const MUTED = '#929AA7';

function SkateboardQRCode({ value }: { value: string }) {
  return (
    <View style={s.boardWrap}>
      <Svg width={280} height={390} viewBox="0 0 280 390" style={s.boardSvg}>
        <Path d="M140 8 C194 8 222 36 224 76 L238 304 C240 342 208 376 164 380 L116 380 C72 376 40 342 42 304 L56 76 C58 36 86 8 140 8 Z" fill={ORANGE} stroke={INK} strokeWidth="8" />
        <Path d="M73 83 H207" stroke={INK} strokeWidth="8" strokeLinecap="round" />
        <Path d="M73 307 H207" stroke={INK} strokeWidth="8" strokeLinecap="round" />
        {[91, 111, 169, 189].map((cx) => <Circle key={`t${cx}`} cx={cx} cy="61" r="5" fill={PAPER} />)}
        {[91, 111, 169, 189].map((cx) => <Circle key={`b${cx}`} cx={cx} cy="329" r="5" fill={PAPER} />)}
        <Circle cx="38" cy="92" r="14" fill="#111827" stroke={PAPER} strokeWidth="4" />
        <Circle cx="242" cy="92" r="14" fill="#111827" stroke={PAPER} strokeWidth="4" />
        <Circle cx="38" cy="298" r="14" fill="#111827" stroke={PAPER} strokeWidth="4" />
        <Circle cx="242" cy="298" r="14" fill="#111827" stroke={PAPER} strokeWidth="4" />
      </Svg>
      <View style={s.qrPaper}>
        <QRCode value={value} size={196} quietZone={8} backgroundColor="#FFFFFF" color={INK} />
      </View>
      <View style={s.boardFooter}>
        <Text style={s.boardBrand}>SKATEQUEST</Text>
        <Text style={s.boardTag}>HUNT • LAND IT • GIVE BACK</Text>
      </View>
    </View>
  );
}

export default function HideQRCodeScreenVerified() {
  const navigation = useNavigation<any>();
  const [locating, setLocating] = useState(true);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState('');
  const [trick, setTrick] = useState('');
  const [purchaseId, setPurchaseId] = useState<string | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [startingPayment, setStartingPayment] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  const locate = async () => {
    setLocating(true);
    setLocationError(null);
    try {
      const loc = await getCurrentLocation();
      setCoords({ lat: loc.latitude, lng: loc.longitude });
    } catch (error) {
      setCoords(null);
      setLocationError(error instanceof Error ? error.message : 'Could not get your location.');
    } finally {
      setLocating(false);
    }
  };

  const refreshPayment = async (showMessage = false) => {
    setCheckingPayment(true);
    try {
      const { data, error } = await supabase.rpc('get_unused_qr_support_purchase');
      if (error) throw error;
      const id = typeof data === 'string' ? data : null;
      setPurchaseId(id);
      if (showMessage) {
        Alert.alert(id ? 'Payment confirmed' : 'Still waiting', id ? 'Your $2 QR purchase is ready to use.' : 'Stripe has not confirmed a paid QR purchase yet.');
      }
    } catch (error: any) {
      if (showMessage) Alert.alert('Payment check failed', error?.message || 'Please try again.');
    } finally {
      setCheckingPayment(false);
    }
  };

  useEffect(() => {
    void locate();
    void refreshPayment(false);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshPayment(false);
    });
    return () => sub.remove();
  }, []);

  const startCheckout = async () => {
    setStartingPayment(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-qr-support-checkout', { body: {} });
      if (error) throw error;
      const url = data?.checkout_url;
      if (!url) throw new Error(data?.error || 'Stripe checkout did not return a payment page.');
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) throw new Error('Could not open the secure payment page.');
      await Linking.openURL(url);
    } catch (error: any) {
      Alert.alert('Could not start $2 checkout', error?.message || 'Please try again.');
    } finally {
      setStartingPayment(false);
    }
  };

  const createCode = async () => {
    if (!coords) {
      Alert.alert('Location required', 'Get a real GPS location before hiding the QR.');
      return;
    }
    if (!purchaseId) {
      Alert.alert('Payment required', 'A confirmed $2 QR purchase is required before a code can be hidden.');
      return;
    }
    if (!trick.trim()) {
      Alert.alert('Trick required', 'Every QR Hunt code must include a trick for the finder to land.');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('create_hidden_qr', {
        p_latitude: coords.lat,
        p_longitude: coords.lng,
        p_location_description: description.trim() || null,
        p_trick_challenge: trick.trim(),
        p_challenge_message: message.trim() || null,
        p_proof_required: true,
        p_support_purchase_id: purchaseId,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.code) throw new Error('The server did not return a QR code.');
      SkateEvents.qrCodeHidden();
      setCreatedCode(row.code);
      setPurchaseId(null);
    } catch (error: any) {
      Alert.alert('Could not hide QR', error?.message || 'Please try again.');
      await refreshPayment(false);
    } finally {
      setSaving(false);
    }
  };

  if (createdCode) {
    return (
      <SafeAreaView style={s.container} edges={['top', 'bottom']}>
        <View pointerEvents="none" style={s.successTexture}>
          <View style={s.successSlash} />
          <View style={s.successAcid} />
          <View style={s.successOrb} />
        </View>
        <ScrollView contentContainerStyle={s.successContent} showsVerticalScrollIndicator={false}>
          <View style={s.successHeader}>
            <Pressable style={s.backIcon} onPress={() => setCreatedCode(null)} accessibilityLabel="Back to QR Hunts">
              <ArrowLeft size={20} color={PAPER} strokeWidth={2.8} />
            </Pressable>
            <View style={s.successPill}>
              <CheckCircle2 color={ACID} size={15} />
              <Text style={s.successPillText}>HUNT READY</Text>
            </View>
          </View>

          <View style={s.successHero}>
            <Text style={s.successKicker}>PAID QR HUNT READY</Text>
            <Text style={s.successTitle}>HIDE THE{`\n`}BOARD.</Text>
            <Text style={s.successIntro}>Print or save this board and physically hide it at the GPS point you just locked.</Text>
          </View>

          <View style={s.boardCard}>
            <SkateboardQRCode value={createdCode} />
            <View style={s.codeTicket}>
              <Crosshair color={INK} size={18} />
              <Text selectable style={s.codeText}>{createdCode}</Text>
            </View>
          </View>

          <View style={s.howItWorks}>
            <FlowStep number="01" title="FINDER SCANS THERE" body="GPS verifies the physical hiding point." />
            <FlowStep number="02" title="THEY LAND YOUR TRICK" body="A real video clip is required." />
            <FlowStep number="03" title="YOU APPROVE PROOF" body="Only then does the hunt award 50 XP." />
          </View>

          <View style={s.supportStrip}>
            <HeartHandshake color={INK} size={19} />
            <Text style={s.supportStripText}>$2 support purchase recorded · 50 XP only after approved trick proof.</Text>
          </View>

          <Pressable style={s.primaryButton} onPress={() => setCreatedCode(null)}>
            <Text style={s.primaryButtonText}>Back to QR Hunts</Text>
            <View style={s.primaryArrow}><ArrowRight color={INK} size={18} strokeWidth={3} /></View>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const canGenerate = !saving && !locating && !!coords && !!purchaseId && !!trick.trim();

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={s.headerRow}>
            <Pressable style={s.backIcon} onPress={() => navigation.goBack()} accessibilityLabel="Go back">
              <ArrowLeft size={20} color={PAPER} strokeWidth={2.8} />
            </Pressable>
            <View style={s.headerPill}>
              <Target color={ACID} size={15} />
              <Text style={s.headerPillText}>HIDER MODE</Text>
            </View>
          </View>

          <View style={s.hero}>
            <View style={s.heroSlashOrange} />
            <View style={s.heroSlashAcid} />
            <View style={s.heroOrb} />
            <View style={s.heroStamp}>
              <Crosshair color={INK} size={29} strokeWidth={2.9} />
            </View>
            <Text style={s.heroKicker}>QR HUNT // CREATE</Text>
            <Text style={s.heroTitle}>HIDE IT.{`\n`}SET THE TRICK.</Text>
            <Text style={s.heroSub}>A real place. A real challenge. A real proof clip before XP moves.</Text>
          </View>

          <View style={s.rulesTicket}>
            <View style={s.rulesIcon}><HeartHandshake size={20} color={INK} /></View>
            <View style={s.rulesCopy}>
              <Text style={s.rulesTitle}>HUNT + TRICK + GIVE BACK</Text>
              <Text style={s.rulesText}>Every hidden QR costs $2. Payment is tracked in SkateQuest’s skateboard support fund. A code cannot be generated until Stripe confirms payment.</Text>
            </View>
          </View>

          <View style={s.statusGrid}>
            <StatusTile
              icon={<CreditCard color={purchaseId ? INK : PAPER} size={18} />}
              label="PAYMENT"
              value={purchaseId ? 'READY' : 'NEEDED'}
              active={!!purchaseId}
            />
            <StatusTile
              icon={<MapPin color={coords ? INK : PAPER} size={18} />}
              label="GPS"
              value={coords ? 'LOCKED' : locating ? 'CHECKING' : 'RETRY'}
              active={!!coords}
            />
            <StatusTile
              icon={<ShieldCheck color={trick.trim() ? INK : PAPER} size={18} />}
              label="PROOF"
              value={trick.trim() ? 'REQUIRED' : 'SET TRICK'}
              active={!!trick.trim()}
            />
          </View>

          <QRSupportFundCard />
          <QRTrickReviewPanel />

          <View style={[s.paymentCard, purchaseId && s.paymentCardReady]}>
            <View style={s.sectionHeader}>
              <View style={[s.sectionNumber, purchaseId && s.sectionNumberReady]}>
                <Text style={s.sectionNumberText}>01</Text>
              </View>
              <View style={s.sectionHeadingCopy}>
                <Text style={s.sectionKicker}>UNLOCK ONE HUNT</Text>
                <Text style={s.sectionTitle}>{purchaseId ? '$2 payment confirmed' : '$2 payment required'}</Text>
              </View>
              {purchaseId ? <Check color={INK} size={21} strokeWidth={3} /> : <CreditCard color={ORANGE} size={21} />}
            </View>
            <Text style={s.sectionBody}>One confirmed payment unlocks exactly one hidden QR.</Text>

            {!purchaseId ? (
              <Pressable style={[s.checkoutButton, startingPayment && s.disabled]} onPress={() => void startCheckout()} disabled={startingPayment}>
                {startingPayment ? <ActivityIndicator color={INK} /> : <CreditCard color={INK} size={18} />}
                <Text style={s.checkoutText}>{startingPayment ? 'Opening secure checkout…' : 'Pay $2 & Support Skateboarding'}</Text>
                {!startingPayment ? <ArrowRight color={INK} size={17} strokeWidth={3} /> : null}
              </Pressable>
            ) : null}

            <Pressable style={s.checkPaymentButton} onPress={() => void refreshPayment(true)} disabled={checkingPayment}>
              {checkingPayment ? <ActivityIndicator size="small" color={MUTED} /> : <RefreshCw size={15} color={MUTED} />}
              <Text style={s.checkPaymentText}>{checkingPayment ? 'Checking payment…' : 'Check payment status'}</Text>
            </Pressable>
          </View>

          <View style={s.locationCard}>
            <View style={s.sectionHeader}>
              <View style={[s.sectionNumber, coords && s.sectionNumberReady]}><Text style={s.sectionNumberText}>02</Text></View>
              <View style={s.sectionHeadingCopy}>
                <Text style={s.sectionKicker}>REAL-WORLD LOCK</Text>
                <Text style={s.sectionTitle}>GPS hiding point</Text>
              </View>
              <MapPin color={coords ? INK : ORANGE} size={21} />
            </View>

            {locating ? (
              <View style={s.locationState}>
                <ActivityIndicator color={ORANGE} />
                <Text style={s.locationStateText}>Getting real GPS location…</Text>
              </View>
            ) : locationError ? (
              <View style={s.errorState}>
                <Text style={s.errorStateTitle}>GPS NOT LOCKED</Text>
                <Text style={s.errorStateText}>{locationError}</Text>
                <Pressable onPress={() => void locate()} style={s.retryLocation}>
                  <RefreshCw color={INK} size={15} />
                  <Text style={s.retryLocationText}>TRY LOCATION AGAIN</Text>
                </Pressable>
              </View>
            ) : (
              <View style={s.locationReady}>
                <View style={s.locationReadyIcon}><Check color={INK} size={17} strokeWidth={3} /></View>
                <View style={s.locationReadyCopy}>
                  <Text style={s.locationReadyTitle}>HIDE POINT LOCKED</Text>
                  <Text style={s.locationReadyText}>Your current GPS position will be saved with this QR.</Text>
                </View>
              </View>
            )}
          </View>

          <View style={s.formCard}>
            <View style={s.sectionHeader}>
              <View style={[s.sectionNumber, trick.trim() && s.sectionNumberReady]}><Text style={s.sectionNumberText}>03</Text></View>
              <View style={s.sectionHeadingCopy}>
                <Text style={s.sectionKicker}>BUILD THE CHALLENGE</Text>
                <Text style={s.sectionTitle}>What do they have to land?</Text>
              </View>
              <Sparkles color={ACID} size={21} />
            </View>

            <Field
              label="REQUIRED TRICK *"
              placeholder="Example: kickflip, frontside 180, 50-50"
              value={trick}
              onChangeText={setTrick}
              accent
            />
            <Field
              label="HIDE SPOT DESCRIPTION"
              hint="OPTIONAL"
              placeholder="Example: under the bench beside the bowl"
              value={description}
              onChangeText={setDescription}
            />
            <Field
              label="MESSAGE FOR FINDER"
              hint="OPTIONAL"
              placeholder="Leave a short note"
              value={message}
              onChangeText={setMessage}
              multiline
            />

            <View style={s.proofNotice}>
              <ShieldCheck color={INK} size={19} />
              <View style={s.proofNoticeCopy}>
                <Text style={s.proofNoticeTitle}>50 XP // PROOF REQUIRED</Text>
                <Text style={s.proofNoticeText}>Scanning only verifies the hunt. XP is awarded after the finder uploads the trick and the hider approves it.</Text>
              </View>
            </View>
          </View>

          <Pressable
            style={[s.generateButton, !canGenerate && s.generateDisabled]}
            onPress={() => void createCode()}
            disabled={!canGenerate}
          >
            {saving ? (
              <ActivityIndicator color={INK} />
            ) : (
              <>
                <View style={s.generateIcon}><Crosshair color={INK} size={21} strokeWidth={2.9} /></View>
                <View style={s.generateCopy}>
                  <Text style={s.generateTitle}>Generate Paid Trick QR</Text>
                  <Text style={s.generateSub}>PAYMENT + GPS + TRICK MUST BE READY</Text>
                </View>
                <ArrowRight color={INK} size={20} strokeWidth={3} />
              </>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function StatusTile({ icon, label, value, active }: { icon: React.ReactNode; label: string; value: string; active: boolean }) {
  return (
    <View style={[s.statusTile, active && s.statusTileActive]}>
      <View style={s.statusTileTop}>{icon}</View>
      <Text style={[s.statusLabel, active && s.statusLabelActive]}>{label}</Text>
      <Text style={[s.statusValue, active && s.statusValueActive]}>{value}</Text>
    </View>
  );
}

function Field({
  label,
  hint,
  placeholder,
  value,
  onChangeText,
  accent = false,
  multiline = false,
}: {
  label: string;
  hint?: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  accent?: boolean;
  multiline?: boolean;
}) {
  return (
    <View style={s.field}>
      <View style={s.fieldLabelRow}>
        <Text style={[s.fieldLabel, accent && s.fieldLabelAccent]}>{label}</Text>
        {hint ? <Text style={s.fieldHint}>{hint}</Text> : null}
      </View>
      <TextInput
        style={[s.input, multiline && s.inputMultiline, accent && s.inputAccent]}
        placeholder={placeholder}
        placeholderTextColor="#777D87"
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

function FlowStep({ number, title, body }: { number: string; title: string; body: string }) {
  return (
    <View style={s.flowStep}>
      <View style={s.flowNumber}><Text style={s.flowNumberText}>{number}</Text></View>
      <View style={s.flowCopy}>
        <Text style={s.flowTitle}>{title}</Text>
        <Text style={s.flowBody}>{body}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: INK },
  flex: { flex: 1 },
  content: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 42 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  backIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#11151B', borderWidth: 1, borderColor: '#303641', alignItems: 'center', justifyContent: 'center' },
  headerPill: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 35, paddingHorizontal: 10, borderRadius: 999, backgroundColor: '#11151B', borderWidth: 1, borderColor: '#303641' },
  headerPillText: { color: PAPER, fontSize: 8, fontWeight: '900', letterSpacing: 1 },

  hero: { minHeight: 248, borderRadius: 29, padding: 18, backgroundColor: '#11141A', borderWidth: 1, borderColor: '#2A2E36', overflow: 'hidden', position: 'relative', justifyContent: 'flex-end' },
  heroSlashOrange: { position: 'absolute', width: 260, height: 82, right: -96, top: 31, backgroundColor: ORANGE, transform: [{ rotate: '31deg' }] },
  heroSlashAcid: { position: 'absolute', width: 220, height: 25, left: -86, bottom: 48, backgroundColor: ACID, transform: [{ rotate: '-12deg' }] },
  heroOrb: { position: 'absolute', width: 132, height: 132, borderRadius: 66, right: 14, bottom: -28, backgroundColor: BLUE, opacity: 0.15 },
  heroStamp: { position: 'absolute', top: 18, left: 18, width: 62, height: 62, borderRadius: 18, backgroundColor: ACID, borderWidth: 3, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] },
  heroKicker: { color: ORANGE, fontSize: 9, fontWeight: '900', letterSpacing: 1.7 },
  heroTitle: { color: PAPER, fontSize: 42, lineHeight: 38, fontWeight: '900', letterSpacing: -2.4, marginTop: 5 },
  heroSub: { color: '#B4BBC5', fontSize: 11, lineHeight: 16, fontWeight: '700', maxWidth: 300, marginTop: 8 },

  rulesTicket: { flexDirection: 'row', alignItems: 'center', gap: 11, minHeight: 92, marginTop: 10, borderRadius: 20, padding: 12, backgroundColor: PAPER, borderWidth: 2, borderColor: INK },
  rulesIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] },
  rulesCopy: { flex: 1 },
  rulesTitle: { color: INK, fontSize: 10, fontWeight: '900', letterSpacing: 0.9 },
  rulesText: { color: '#666C75', fontSize: 9.5, lineHeight: 14, fontWeight: '700', marginTop: 4 },

  statusGrid: { flexDirection: 'row', gap: 8, marginTop: 10, marginBottom: 14 },
  statusTile: { flex: 1, minHeight: 84, borderRadius: 16, padding: 10, backgroundColor: '#11151B', borderWidth: 1, borderColor: '#303641' },
  statusTileActive: { backgroundColor: ACID, borderWidth: 2, borderColor: INK },
  statusTileTop: { height: 24 },
  statusLabel: { color: '#6F7886', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.8, marginTop: 6 },
  statusLabelActive: { color: 'rgba(7,8,11,0.58)' },
  statusValue: { color: PAPER, fontSize: 9, fontWeight: '900', letterSpacing: 0.5, marginTop: 2 },
  statusValueActive: { color: INK },

  paymentCard: { marginBottom: 10, borderRadius: 22, padding: 15, backgroundColor: PAPER, borderWidth: 2, borderColor: INK },
  paymentCardReady: { backgroundColor: ACID },
  locationCard: { marginBottom: 10, borderRadius: 22, padding: 15, backgroundColor: PAPER, borderWidth: 2, borderColor: INK },
  formCard: { marginBottom: 10, borderRadius: 22, padding: 15, backgroundColor: '#11151B', borderWidth: 1, borderColor: '#303641' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionNumber: { width: 39, height: 39, borderRadius: 12, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] },
  sectionNumberReady: { backgroundColor: ACID },
  sectionNumberText: { color: INK, fontSize: 11, fontWeight: '900' },
  sectionHeadingCopy: { flex: 1 },
  sectionKicker: { color: ORANGE, fontSize: 7, fontWeight: '900', letterSpacing: 1.1 },
  sectionTitle: { color: INK, fontSize: 16, fontWeight: '900', letterSpacing: -0.4, marginTop: 1 },
  sectionBody: { color: '#686C70', fontSize: 10, lineHeight: 15, fontWeight: '700', marginTop: 10 },
  checkoutButton: { minHeight: 52, borderRadius: 14, backgroundColor: ORANGE, borderWidth: 2, borderColor: INK, marginTop: 13, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkoutText: { flex: 1, color: INK, fontSize: 10, fontWeight: '900', letterSpacing: 0.3 },
  checkPaymentButton: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 5 },
  checkPaymentText: { color: '#666C75', fontSize: 9, fontWeight: '800' },
  disabled: { opacity: 0.5 },

  locationState: { minHeight: 62, marginTop: 13, borderRadius: 15, backgroundColor: '#E9E4DA', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  locationStateText: { color: '#666C75', fontSize: 10, fontWeight: '800' },
  errorState: { marginTop: 13, borderRadius: 15, padding: 12, backgroundColor: '#FFE6E1', borderWidth: 1, borderColor: '#D67B6C' },
  errorStateTitle: { color: '#8C3427', fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  errorStateText: { color: '#764C45', fontSize: 10, lineHeight: 15, marginTop: 4 },
  retryLocation: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 34, borderRadius: 10, paddingHorizontal: 9, backgroundColor: ORANGE, borderWidth: 1, borderColor: INK, marginTop: 9 },
  retryLocationText: { color: INK, fontSize: 7.5, fontWeight: '900', letterSpacing: 0.6 },
  locationReady: { minHeight: 66, marginTop: 13, borderRadius: 15, padding: 11, backgroundColor: ACID, borderWidth: 1.5, borderColor: INK, flexDirection: 'row', alignItems: 'center', gap: 9 },
  locationReadyIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' },
  locationReadyCopy: { flex: 1 },
  locationReadyTitle: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  locationReadyText: { color: 'rgba(7,8,11,0.68)', fontSize: 9, lineHeight: 13, marginTop: 2 },

  field: { marginTop: 14 },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  fieldLabel: { color: PAPER, fontSize: 7.5, fontWeight: '900', letterSpacing: 1 },
  fieldLabelAccent: { color: ORANGE },
  fieldHint: { color: '#67707C', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.7 },
  input: { minHeight: 52, borderRadius: 14, paddingHorizontal: 13, backgroundColor: '#1A2029', borderWidth: 1, borderColor: '#343C48', color: PAPER, fontSize: 13, fontWeight: '700' },
  inputAccent: { borderColor: '#74412F' },
  inputMultiline: { minHeight: 88, paddingTop: 13 },
  proofNotice: { minHeight: 76, marginTop: 15, borderRadius: 15, padding: 11, backgroundColor: ACID, borderWidth: 2, borderColor: INK, flexDirection: 'row', alignItems: 'center', gap: 9 },
  proofNoticeCopy: { flex: 1 },
  proofNoticeTitle: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  proofNoticeText: { color: 'rgba(7,8,11,0.68)', fontSize: 9, lineHeight: 13, marginTop: 3 },

  generateButton: { minHeight: 68, borderRadius: 18, backgroundColor: ACID, borderWidth: 2, borderColor: INK, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  generateDisabled: { opacity: 0.42 },
  generateIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] },
  generateCopy: { flex: 1 },
  generateTitle: { color: INK, fontSize: 12, fontWeight: '900', letterSpacing: 0.3 },
  generateSub: { color: 'rgba(7,8,11,0.58)', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.6, marginTop: 2 },

  boardWrap: { width: 280, height: 390, alignItems: 'center', justifyContent: 'center' },
  boardSvg: { position: 'absolute' },
  qrPaper: { backgroundColor: '#FFFFFF', padding: 14, borderRadius: 14, borderWidth: 3, borderColor: INK },
  boardFooter: { position: 'absolute', bottom: 24, alignItems: 'center' },
  boardBrand: { color: PAPER, fontSize: 15, fontWeight: '900', letterSpacing: 1.8 },
  boardTag: { color: INK, fontSize: 9, fontWeight: '900', marginTop: 2 },

  successTexture: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden' },
  successSlash: { position: 'absolute', width: 440, height: 92, backgroundColor: ORANGE, right: -180, top: 120, transform: [{ rotate: '30deg' }], opacity: 0.9 },
  successAcid: { position: 'absolute', width: 360, height: 34, backgroundColor: ACID, left: -150, bottom: 105, transform: [{ rotate: '-12deg' }] },
  successOrb: { position: 'absolute', width: 190, height: 190, borderRadius: 95, backgroundColor: BLUE, opacity: 0.12, right: -60, bottom: 25 },
  successContent: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 42 },
  successHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  successPill: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 35, paddingHorizontal: 10, borderRadius: 999, backgroundColor: '#11151B', borderWidth: 1, borderColor: '#303641' },
  successPillText: { color: PAPER, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  successHero: { marginTop: 22 },
  successKicker: { color: ORANGE, fontSize: 9, fontWeight: '900', letterSpacing: 1.7 },
  successTitle: { color: PAPER, fontSize: 43, lineHeight: 39, fontWeight: '900', letterSpacing: -2.4, marginTop: 5 },
  successIntro: { color: MUTED, fontSize: 11, lineHeight: 17, fontWeight: '700', maxWidth: 330, marginTop: 8 },
  boardCard: { alignItems: 'center', marginTop: 20, borderRadius: 26, paddingVertical: 14, paddingHorizontal: 10, backgroundColor: PAPER, borderWidth: 2, borderColor: INK },
  codeTicket: { width: '100%', minHeight: 48, borderRadius: 14, paddingHorizontal: 11, backgroundColor: '#E9E4DA', borderWidth: 1, borderColor: '#CFC8BB', flexDirection: 'row', alignItems: 'center', gap: 8 },
  codeText: { flex: 1, color: INK, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 11, fontWeight: '700' },
  howItWorks: { gap: 8, marginTop: 12 },
  flowStep: { minHeight: 62, borderRadius: 16, padding: 10, backgroundColor: '#11151B', borderWidth: 1, borderColor: '#303641', flexDirection: 'row', alignItems: 'center', gap: 10 },
  flowNumber: { width: 38, height: 38, borderRadius: 12, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-3deg' }] },
  flowNumberText: { color: INK, fontSize: 9, fontWeight: '900' },
  flowCopy: { flex: 1 },
  flowTitle: { color: PAPER, fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  flowBody: { color: MUTED, fontSize: 9, lineHeight: 13, marginTop: 2 },
  supportStrip: { minHeight: 64, borderRadius: 16, padding: 11, backgroundColor: ACID, borderWidth: 2, borderColor: INK, flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 10 },
  supportStripText: { flex: 1, color: INK, fontSize: 9, lineHeight: 14, fontWeight: '800' },
  primaryButton: { minHeight: 56, borderRadius: 16, backgroundColor: ACID, borderWidth: 2, borderColor: INK, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  primaryButtonText: { color: INK, fontSize: 11, fontWeight: '900', letterSpacing: 0.4 },
  primaryArrow: { width: 34, height: 34, borderRadius: 11, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' },
});