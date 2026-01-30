import { supabase } from './supabase';

/**
 * Log a shop redemption to the global activity feed
 * The database trigger handles achievements and spot claims automatically
 */
export async function logShopRedeem(
  userId: string,
  itemName: string,
  itemType: 'deal' | 'rare' | 'epic' | 'legendary' = 'deal'
): Promise<{ success: boolean; activityId?: string; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('log_shop_redeem', {
      p_user_id: userId,
      p_item_name: itemName,
      p_item_type: itemType,
    });

    if (error) {
      console.error('Error logging shop redemption:', error);
      return { success: false, error: error.message };
    }

    return { success: true, activityId: data };
  } catch (error) {
    console.error('Error logging shop redemption:', error);
    return { success: false, error: 'Failed to log activity' };
  }
}

/**
 * Manually log a custom activity (for special events)
 */
export async function logCustomActivity(
  userId: string,
  activityType: 'achievement' | 'spot_claim' | 'shop_redeem' | 'level_up' | 'first_blood',
  message: string,
  metadata: Record<string, unknown> = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('activity_feed').insert({
      user_id: userId,
      activity_type: activityType,
      message,
      metadata,
    });

    if (error) {
      console.error('Error logging custom activity:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error logging custom activity:', error);
    return { success: false, error: 'Failed to log activity' };
  }
}
