import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Animated,
  Dimensions,
  Modal,
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BADGE_SIZE = (SCREEN_WIDTH - 60) / 3;

// Achievement definitions
interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xp_reward: number;
  requirement_type: string;
  requirement_value: number;
  category: 'territory' | 'social' | 'tricks' | 'explorer' | 'special';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface UserAchievement {
  achievement_id: string;
  earned_at: string;
  is_new: boolean;
}

const RARITY_COLORS = {
  common: '#95a5a6',
  rare: '#3498db',
  epic: '#9b59b6',
  legendary: '#f39c12',
};

const CATEGORY_ICONS = {
  territory: '⚔️',
  social: '👥',
  tricks: '🛹',
  explorer: '🗺️',
  special: '⭐',
};

export default function AchievementsScreen() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<Map<string, UserAchievement>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [newlyEarned, setNewlyEarned] = useState<string[]>([]);
  const confettiRef = useRef<ConfettiCannon>(null);

  // Animation values for badges
  const scaleAnims = useRef<Map<string, Animated.Value>>(new Map());

  const getScaleAnim = (id: string) => {
    if (!scaleAnims.current.has(id)) {
      scaleAnims.current.set(id, new Animated.Value(1));
    }
    return scaleAnims.current.get(id)!;
  };

  const loadAchievements = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch all achievements
      const { data: achievementsData, error: achievementsError } = await supabase
        .from('achievements')
        .select('*')
        .order('category')
        .order('rarity');

      if (achievementsError) {
        console.error('Error fetching achievements:', achievementsError);
        return;
      }

      setAchievements(achievementsData || []);

      // Fetch user's earned achievements
      if (user) {
        const { data: userAchievementsData, error: userAchievementsError } = await supabase
          .from('user_achievements')
          .select('achievement_id, earned_at, is_new')
          .eq('user_id', user.id);

        if (!userAchievementsError && userAchievementsData) {
          const achievementMap = new Map<string, UserAchievement>();
          const newOnes: string[] = [];

          userAchievementsData.forEach(ua => {
            achievementMap.set(ua.achievement_id, {
              achievement_id: ua.achievement_id,
              earned_at: ua.earned_at,
              is_new: ua.is_new,
            });
            if (ua.is_new) {
              newOnes.push(ua.achievement_id);
            }
          });

          setUserAchievements(achievementMap);
          setNewlyEarned(newOnes);

          // Show confetti if there are new achievements
          if (newOnes.length > 0) {
            setTimeout(() => {
              setShowConfetti(true);
              // Mark achievements as seen
              markAchievementsSeen(newOnes);
            }, 500);
          }
        }
      }
    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const markAchievementsSeen = async (achievementIds: string[]) => {
    if (!user) return;

    try {
      await supabase
        .from('user_achievements')
        .update({ is_new: false })
        .eq('user_id', user.id)
        .in('achievement_id', achievementIds);
    } catch (error) {
      console.error('Error marking achievements as seen:', error);
    }
  };

  useEffect(() => {
    loadAchievements();

    // Subscribe to new achievements
    if (user) {
      const subscription = supabase
        .channel('user-achievements-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'user_achievements',
            filter: `user_id=eq.${user.id}`,
          },
          payload => {
            // New achievement earned!
            const newAchievement = payload.new as UserAchievement;
            setUserAchievements(prev => {
              const newMap = new Map(prev);
              newMap.set(newAchievement.achievement_id, {
                ...newAchievement,
                is_new: true,
              });
              return newMap;
            });
            setNewlyEarned(prev => [...prev, newAchievement.achievement_id]);
            setShowConfetti(true);
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [loadAchievements, user]);

  const handleBadgePress = (achievement: Achievement) => {
    const isEarned = userAchievements.has(achievement.id);
    setSelectedAchievement(achievement);

    // Animate the badge
    const anim = getScaleAnim(achievement.id);
    Animated.sequence([
      Animated.timing(anim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(anim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const renderBadge = ({ item }: { item: Achievement }) => {
    const isEarned = userAchievements.has(item.id);
    const isNew = newlyEarned.includes(item.id);
    const rarityColor = RARITY_COLORS[item.rarity];
    const scaleAnim = getScaleAnim(item.id);

    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          style={[
            styles.badgeContainer,
            !isEarned && styles.badgeContainerLocked,
            isNew && styles.badgeContainerNew,
          ]}
          onPress={() => handleBadgePress(item)}
          activeOpacity={0.7}
        >
          {/* Rarity border */}
          <View style={[styles.badgeBorder, { borderColor: isEarned ? rarityColor : '#ccc' }]}>
            {/* Badge icon */}
            <View
              style={[
                styles.badgeInner,
                { backgroundColor: isEarned ? rarityColor + '20' : '#f5f5f5' },
              ]}
            >
              <Text style={[styles.badgeIcon, !isEarned && styles.badgeIconLocked]}>
                {item.icon}
              </Text>
            </View>
          </View>

          {/* Lock overlay for unearned */}
          {!isEarned && (
            <View style={styles.lockOverlay}>
              <Text style={styles.lockIcon}>🔒</Text>
            </View>
          )}

          {/* New badge indicator */}
          {isNew && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW!</Text>
            </View>
          )}

          {/* Badge name */}
          <Text style={[styles.badgeName, !isEarned && styles.badgeNameLocked]} numberOfLines={2}>
            {item.name}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderCategoryHeader = (category: string) => (
    <View style={styles.categoryHeader}>
      <Text style={styles.categoryIcon}>
        {CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS]}
      </Text>
      <Text style={styles.categoryTitle}>
        {category.charAt(0).toUpperCase() + category.slice(1)}
      </Text>
    </View>
  );

  // Group achievements by category
  const groupedAchievements = achievements.reduce(
    (acc, achievement) => {
      if (!acc[achievement.category]) {
        acc[achievement.category] = [];
      }
      acc[achievement.category].push(achievement);
      return acc;
    },
    {} as Record<string, Achievement[]>
  );

  const earnedCount = userAchievements.size;
  const totalCount = achievements.length;
  const progressPercent = totalCount > 0 ? (earnedCount / totalCount) * 100 : 0;

  return (
    <View style={styles.container}>
      {/* Confetti animation */}
      {showConfetti && (
        <ConfettiCannon
          ref={confettiRef}
          count={200}
          origin={{ x: SCREEN_WIDTH / 2, y: 0 }}
          autoStart={true}
          fadeOut={true}
          onAnimationEnd={() => setShowConfetti(false)}
          colors={['#f39c12', '#9b59b6', '#3498db', '#2ecc71', '#e74c3c']}
        />
      )}

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🏆 Achievements</Text>
        <Text style={styles.headerSubtitle}>Collect badges, earn glory</Text>

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {earnedCount} / {totalCount} Unlocked
          </Text>
        </View>
      </View>

      {/* Achievement grid */}
      <FlatList
        data={Object.entries(groupedAchievements)}
        renderItem={({ item: [category, categoryAchievements] }) => (
          <View key={category}>
            {renderCategoryHeader(category)}
            <View style={styles.badgeGrid}>
              {categoryAchievements.map(achievement => (
                <View key={achievement.id}>{renderBadge({ item: achievement })}</View>
              ))}
            </View>
          </View>
        )}
        keyExtractor={([category]) => category}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadAchievements} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🎖️</Text>
            <Text style={styles.emptyText}>No achievements available</Text>
          </View>
        }
      />

      {/* Achievement Detail Modal */}
      <Modal
        visible={!!selectedAchievement}
        animationType="fade"
        transparent
        onRequestClose={() => setSelectedAchievement(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedAchievement(null)}
        >
          {selectedAchievement && (
            <View style={styles.modalContent}>
              <View
                style={[
                  styles.modalBadge,
                  {
                    borderColor: userAchievements.has(selectedAchievement.id)
                      ? RARITY_COLORS[selectedAchievement.rarity]
                      : '#ccc',
                  },
                ]}
              >
                <Text style={styles.modalBadgeIcon}>{selectedAchievement.icon}</Text>
              </View>

              <Text style={styles.modalTitle}>{selectedAchievement.name}</Text>

              <View
                style={[
                  styles.rarityBadge,
                  { backgroundColor: RARITY_COLORS[selectedAchievement.rarity] },
                ]}
              >
                <Text style={styles.rarityText}>{selectedAchievement.rarity.toUpperCase()}</Text>
              </View>

              <Text style={styles.modalDescription}>{selectedAchievement.description}</Text>

              <View style={styles.modalReward}>
                <Text style={styles.modalRewardLabel}>Reward</Text>
                <Text style={styles.modalRewardValue}>+{selectedAchievement.xp_reward} XP</Text>
              </View>

              {userAchievements.has(selectedAchievement.id) ? (
                <View style={styles.earnedBanner}>
                  <Text style={styles.earnedText}>✓ EARNED</Text>
                  <Text style={styles.earnedDate}>
                    {new Date(
                      userAchievements.get(selectedAchievement.id)!.earned_at
                    ).toLocaleDateString()}
                  </Text>
                </View>
              ) : (
                <View style={styles.lockedBanner}>
                  <Text style={styles.lockedText}>🔒 LOCKED</Text>
                  <Text style={styles.lockedHint}>
                    {selectedAchievement.requirement_type}: {selectedAchievement.requirement_value}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSelectedAchievement(null)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          )}
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
    backgroundColor: '#f39c12',
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
  progressContainer: {
    marginTop: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#fff',
    textAlign: 'center',
    marginTop: 6,
  },
  listContainer: {
    padding: 15,
    paddingBottom: 30,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
  },
  categoryIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 10,
  },
  badgeContainer: {
    width: BADGE_SIZE,
    alignItems: 'center',
    padding: 8,
  },
  badgeContainerLocked: {
    opacity: 0.6,
  },
  badgeContainerNew: {
    opacity: 1,
  },
  badgeBorder: {
    width: BADGE_SIZE - 20,
    height: BADGE_SIZE - 20,
    borderRadius: (BADGE_SIZE - 20) / 2,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeInner: {
    width: BADGE_SIZE - 32,
    height: BADGE_SIZE - 32,
    borderRadius: (BADGE_SIZE - 32) / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeIcon: {
    fontSize: 32,
  },
  badgeIconLocked: {
    opacity: 0.4,
  },
  lockOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    bottom: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockIcon: {
    fontSize: 20,
  },
  newBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#e74c3c',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  newBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  badgeName: {
    fontSize: 11,
    color: '#333',
    textAlign: 'center',
    marginTop: 6,
    fontWeight: '600',
  },
  badgeNameLocked: {
    color: '#999',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    margin: 20,
    alignItems: 'center',
    width: SCREEN_WIDTH - 40,
  },
  modalBadge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f0ea',
    marginBottom: 16,
  },
  modalBadgeIcon: {
    fontSize: 50,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  rarityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 16,
  },
  rarityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  modalReward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  modalRewardLabel: {
    fontSize: 14,
    color: '#666',
  },
  modalRewardValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2ecc71',
  },
  earnedBanner: {
    backgroundColor: '#d5f5e3',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  earnedText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  earnedDate: {
    fontSize: 12,
    color: '#27ae60',
    marginTop: 4,
  },
  lockedBanner: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  lockedText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#999',
  },
  lockedHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  closeButton: {
    backgroundColor: '#f39c12',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 10,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
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
    color: '#999',
  },
});
