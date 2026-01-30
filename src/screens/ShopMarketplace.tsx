import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ShopSponsorship {
  id: string;
  shop_id: string;
  shop_name: string;
  shop_address: string;
  deal_title: string;
  deal_description: string;
  discount_percent: number;
  xp_cost: number;
  crew_id: string | null;
  crew_name: string | null;
  crew_color: string | null;
  valid_until: string;
  image_url: string | null;
  is_active: boolean;
}

interface RewardCode {
  id: string;
  code: string;
  sponsorship_id: string;
  deal_title: string;
  shop_name: string;
  expires_at: string;
  redeemed: boolean;
}

interface UserStats {
  xp: number;
  level: number;
}

export default function ShopMarketplace() {
  const { user } = useAuth();
  const [sponsorships, setSponsorships] = useState<ShopSponsorship[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({ xp: 0, level: 1 });
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [activeCode, setActiveCode] = useState<RewardCode | null>(null);
  const [userCodes, setUserCodes] = useState<RewardCode[]>([]);
  const [showMyCodesModal, setShowMyCodesModal] = useState(false);
  const [selectedCodeForQR, setSelectedCodeForQR] = useState<RewardCode | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch shop sponsorships
      const { data: sponsorshipsData, error: sponsorshipsError } = await supabase
        .from('shop_sponsorships')
        .select(
          `
          id,
          shop_id,
          deal_title,
          deal_description,
          discount_percent,
          xp_cost,
          crew_id,
          valid_until,
          image_url,
          is_active,
          shops (
            name,
            address
          ),
          crews (
            name,
            color_hex
          )
        `
        )
        .eq('is_active', true)
        .gte('valid_until', new Date().toISOString())
        .order('discount_percent', { ascending: false });

      if (sponsorshipsError) {
        console.error('Error fetching sponsorships:', sponsorshipsError);
      } else {
        const formattedSponsorships: ShopSponsorship[] = (sponsorshipsData || []).map((s: any) => ({
          id: s.id,
          shop_id: s.shop_id,
          shop_name: s.shops?.name || 'Unknown Shop',
          shop_address: s.shops?.address || '',
          deal_title: s.deal_title,
          deal_description: s.deal_description,
          discount_percent: s.discount_percent,
          xp_cost: s.xp_cost,
          crew_id: s.crew_id,
          crew_name: s.crews?.name || null,
          crew_color: s.crews?.color_hex || null,
          valid_until: s.valid_until,
          image_url: s.image_url,
          is_active: s.is_active,
        }));
        setSponsorships(formattedSponsorships);
      }

      // Fetch user stats
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('xp, level')
          .eq('id', user.id)
          .single();

        if (profileData) {
          setUserStats({
            xp: profileData.xp || 0,
            level: profileData.level || 1,
          });
        }

        // Fetch user's existing reward codes
        const { data: codesData } = await supabase
          .from('reward_codes')
          .select(
            `
            id,
            code,
            sponsorship_id,
            expires_at,
            redeemed,
            shop_sponsorships (
              deal_title,
              shops (name)
            )
          `
          )
          .eq('user_id', user.id)
          .eq('redeemed', false)
          .gte('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false });

        if (codesData) {
          const formattedCodes: RewardCode[] = codesData.map((c: any) => ({
            id: c.id,
            code: c.code,
            sponsorship_id: c.sponsorship_id,
            deal_title: c.shop_sponsorships?.deal_title || 'Deal',
            shop_name: c.shop_sponsorships?.shops?.name || 'Shop',
            expires_at: c.expires_at,
            redeemed: c.redeemed,
          }));
          setUserCodes(formattedCodes);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRedeem = async (sponsorship: ShopSponsorship) => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to redeem deals.');
      return;
    }

    if (userStats.xp < sponsorship.xp_cost) {
      Alert.alert(
        'Not Enough XP',
        `You need ${sponsorship.xp_cost} XP to redeem this deal. You have ${userStats.xp} XP.`
      );
      return;
    }

    Alert.alert(
      'Redeem Deal?',
      `Spend ${sponsorship.xp_cost} XP to get "${sponsorship.deal_title}" at ${sponsorship.shop_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Redeem',
          onPress: async () => {
            try {
              setRedeeming(sponsorship.id);

              // Call Supabase RPC to generate reward code
              const { data, error } = await supabase.rpc('redeem_shop_deal', {
                p_user_id: user.id,
                p_sponsorship_id: sponsorship.id,
                p_xp_cost: sponsorship.xp_cost,
              });

              if (error) {
                throw error;
              }

              if (data && data.code) {
                const newCode: RewardCode = {
                  id: data.id,
                  code: data.code,
                  sponsorship_id: sponsorship.id,
                  deal_title: sponsorship.deal_title,
                  shop_name: sponsorship.shop_name,
                  expires_at: data.expires_at,
                  redeemed: false,
                };

                setActiveCode(newCode);
                setUserCodes(prev => [newCode, ...prev]);
                setUserStats(prev => ({
                  ...prev,
                  xp: prev.xp - sponsorship.xp_cost,
                }));
              }
            } catch (error: any) {
              console.error('Error redeeming deal:', error);
              Alert.alert('Error', error.message || 'Failed to redeem deal. Please try again.');
            } finally {
              setRedeeming(null);
            }
          },
        },
      ]
    );
  };

  const renderDealCard = ({ item }: { item: ShopSponsorship }) => {
    const canAfford = userStats.xp >= item.xp_cost;
    const isRedeeming = redeeming === item.id;
    const daysLeft = Math.ceil(
      (new Date(item.valid_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    return (
      <View style={styles.dealCard}>
        {/* Shop header */}
        <View style={styles.dealHeader}>
          <View style={styles.shopInfo}>
            <Text style={styles.shopName}>{item.shop_name}</Text>
            <Text style={styles.shopAddress}>{item.shop_address}</Text>
          </View>
          {item.crew_name && (
            <View style={[styles.crewBadge, { backgroundColor: item.crew_color || '#666' }]}>
              <Text style={styles.crewBadgeText}>{item.crew_name}</Text>
            </View>
          )}
        </View>

        {/* Deal content */}
        <View style={styles.dealContent}>
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{item.discount_percent}% OFF</Text>
          </View>
          <Text style={styles.dealTitle}>{item.deal_title}</Text>
          <Text style={styles.dealDescription}>{item.deal_description}</Text>
        </View>

        {/* Deal footer */}
        <View style={styles.dealFooter}>
          <View style={styles.dealMeta}>
            <View style={styles.xpCost}>
              <Text style={styles.xpCostValue}>{item.xp_cost}</Text>
              <Text style={styles.xpCostLabel}>XP</Text>
            </View>
            <Text style={styles.expiresText}>
              {daysLeft > 0 ? `${daysLeft} days left` : 'Expires today'}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.redeemButton,
              !canAfford && styles.redeemButtonDisabled,
              isRedeeming && styles.redeemButtonLoading,
            ]}
            onPress={() => handleRedeem(item)}
            disabled={!canAfford || isRedeeming}
          >
            {isRedeeming ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.redeemButtonText}>{canAfford ? 'Redeem' : 'Need More XP'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderUserCodeItem = ({ item }: { item: RewardCode }) => {
    const expiresDate = new Date(item.expires_at);
    const isExpiringSoon = expiresDate.getTime() - Date.now() < 24 * 60 * 60 * 1000;

    return (
      <TouchableOpacity style={styles.userCodeCard} onPress={() => setSelectedCodeForQR(item)}>
        <View style={styles.userCodeInfo}>
          <Text style={styles.userCodeShop}>{item.shop_name}</Text>
          <Text style={styles.userCodeDeal}>{item.deal_title}</Text>
          <Text style={[styles.userCodeExpires, isExpiringSoon && styles.userCodeExpiresUrgent]}>
            Expires: {expiresDate.toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.userCodeAction}>
          <Text style={styles.userCodeActionText}>Show QR</Text>
          <Text style={styles.userCodeArrow}>→</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🛍️ Shop Deals</Text>
        <Text style={styles.headerSubtitle}>Spend XP on real rewards</Text>

        {/* User XP display */}
        <View style={styles.xpDisplay}>
          <Text style={styles.xpDisplayLabel}>Your XP</Text>
          <Text style={styles.xpDisplayValue}>{userStats.xp}</Text>
        </View>
      </View>

      {/* My Codes button */}
      {userCodes.length > 0 && (
        <TouchableOpacity style={styles.myCodesButton} onPress={() => setShowMyCodesModal(true)}>
          <Text style={styles.myCodesButtonText}>🎟️ My Codes ({userCodes.length})</Text>
        </TouchableOpacity>
      )}

      {/* Deals list */}
      <FlatList
        data={sponsorships}
        renderItem={renderDealCard}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🏪</Text>
            <Text style={styles.emptyText}>No deals available</Text>
            <Text style={styles.emptySubtext}>
              Check back soon for sponsored deals from local skate shops!
            </Text>
          </View>
        }
      />

      {/* QR Code Modal for redeemed deal */}
      <Modal
        visible={!!activeCode}
        animationType="slide"
        transparent
        onRequestClose={() => setActiveCode(null)}
      >
        <View style={styles.qrModalOverlay}>
          <View style={styles.qrModalContent}>
            <Text style={styles.qrModalTitle}>🎉 Deal Redeemed!</Text>
            <Text style={styles.qrModalShop}>{activeCode?.shop_name}</Text>
            <Text style={styles.qrModalDeal}>{activeCode?.deal_title}</Text>

            <View style={styles.qrCodeContainer}>
              {activeCode && (
                <QRCode value={activeCode.code} size={200} backgroundColor="#fff" color="#000" />
              )}
            </View>

            <Text style={styles.qrCodeText}>{activeCode?.code}</Text>
            <Text style={styles.qrModalInstructions}>
              Show this QR code to the shop owner to redeem your deal
            </Text>

            <Text style={styles.qrModalExpires}>
              Expires: {activeCode && new Date(activeCode.expires_at).toLocaleDateString()}
            </Text>

            <TouchableOpacity style={styles.qrModalButton} onPress={() => setActiveCode(null)}>
              <Text style={styles.qrModalButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* My Codes Modal */}
      <Modal
        visible={showMyCodesModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowMyCodesModal(false)}
      >
        <View style={styles.myCodesModalOverlay}>
          <View style={styles.myCodesModalContent}>
            <View style={styles.myCodesModalHeader}>
              <Text style={styles.myCodesModalTitle}>🎟️ My Codes</Text>
              <TouchableOpacity onPress={() => setShowMyCodesModal(false)}>
                <Text style={styles.myCodesModalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={userCodes}
              renderItem={renderUserCodeItem}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.myCodesListContainer}
              ListEmptyComponent={<Text style={styles.myCodesEmpty}>No active codes</Text>}
            />
          </View>
        </View>
      </Modal>

      {/* Individual Code QR Modal */}
      <Modal
        visible={!!selectedCodeForQR}
        animationType="fade"
        transparent
        onRequestClose={() => setSelectedCodeForQR(null)}
      >
        <TouchableOpacity
          style={styles.qrModalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedCodeForQR(null)}
        >
          <View style={styles.qrModalContent}>
            <Text style={styles.qrModalShop}>{selectedCodeForQR?.shop_name}</Text>
            <Text style={styles.qrModalDeal}>{selectedCodeForQR?.deal_title}</Text>

            <View style={styles.qrCodeContainer}>
              {selectedCodeForQR && (
                <QRCode
                  value={selectedCodeForQR.code}
                  size={200}
                  backgroundColor="#fff"
                  color="#000"
                />
              )}
            </View>

            <Text style={styles.qrCodeText}>{selectedCodeForQR?.code}</Text>

            <TouchableOpacity
              style={styles.qrModalButton}
              onPress={() => setSelectedCodeForQR(null)}
            >
              <Text style={styles.qrModalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f0ea',
  },
  header: {
    backgroundColor: '#2ecc71',
    padding: 20,
    paddingTop: 50,
    paddingBottom: 25,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    textAlign: 'center',
    marginTop: 5,
  },
  xpDisplay: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    alignItems: 'center',
  },
  xpDisplayLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
  },
  xpDisplayValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  myCodesButton: {
    backgroundColor: '#fff',
    margin: 15,
    marginBottom: 0,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  myCodesButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2ecc71',
  },
  listContainer: {
    padding: 15,
    paddingBottom: 30,
  },
  dealCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  shopInfo: {
    flex: 1,
  },
  shopName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  shopAddress: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  crewBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  crewBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  dealContent: {
    padding: 16,
  },
  discountBadge: {
    backgroundColor: '#e74c3c',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
  },
  discountText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dealTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  dealDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  dealFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 12,
    backgroundColor: '#f8f9fa',
  },
  dealMeta: {
    flex: 1,
  },
  xpCost: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  xpCostValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f39c12',
  },
  xpCostLabel: {
    fontSize: 14,
    color: '#f39c12',
    fontWeight: '600',
  },
  expiresText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  redeemButton: {
    backgroundColor: '#2ecc71',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    minWidth: 120,
    alignItems: 'center',
  },
  redeemButtonDisabled: {
    backgroundColor: '#bdc3c7',
  },
  redeemButtonLoading: {
    backgroundColor: '#27ae60',
  },
  redeemButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // QR Modal
  qrModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    margin: 20,
    alignItems: 'center',
    width: SCREEN_WIDTH - 40,
  },
  qrModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2ecc71',
    marginBottom: 8,
  },
  qrModalShop: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  qrModalDeal: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  qrCodeContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  qrCodeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    letterSpacing: 2,
    fontFamily: 'monospace',
    marginBottom: 16,
  },
  qrModalInstructions: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  qrModalExpires: {
    fontSize: 12,
    color: '#999',
    marginBottom: 20,
  },
  qrModalButton: {
    backgroundColor: '#2ecc71',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 10,
  },
  qrModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // My Codes Modal
  myCodesModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  myCodesModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  myCodesModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  myCodesModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  myCodesModalClose: {
    fontSize: 24,
    color: '#999',
    padding: 4,
  },
  myCodesListContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  myCodesEmpty: {
    textAlign: 'center',
    color: '#999',
    fontSize: 16,
    paddingVertical: 40,
  },
  userCodeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  userCodeInfo: {
    flex: 1,
  },
  userCodeShop: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  userCodeDeal: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  userCodeExpires: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  userCodeExpiresUrgent: {
    color: '#e74c3c',
  },
  userCodeAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userCodeActionText: {
    fontSize: 14,
    color: '#2ecc71',
    fontWeight: '600',
  },
  userCodeArrow: {
    fontSize: 16,
    color: '#2ecc71',
  },
  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 50,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#999',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
});
