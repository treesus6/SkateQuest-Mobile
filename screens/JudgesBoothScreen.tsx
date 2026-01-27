import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const { width, height } = Dimensions.get('window');

interface Submission {
  id: string;
  challenge_id: string;
  user_id: string;
  video_url: string;
  description: string;
  username?: string;
  challenge_description?: string;
  stomped_votes: number;
  bail_votes: number;
}

export default function JudgesBoothScreen() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [votesThisSession, setVotesThisSession] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const videoRef = useRef<Video>(null);

  useEffect(() => {
    fetchPendingSubmissions();
  }, []);

  const fetchPendingSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('challenge_submissions')
        .select(`
          *,
          profiles!challenge_submissions_user_id_fkey(username),
          challenges!challenge_submissions_challenge_id_fkey(description)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(20);

      if (error) throw error;

      const formatted = data?.map((item: any) => ({
        ...item,
        username: item.profiles?.username || 'Unknown',
        challenge_description: item.challenges?.description,
      })) || [];

      setSubmissions(formatted);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (vote: 'stomped' | 'bail') => {
    if (voting || !user?.id || submissions.length === 0) return;

    const submission = submissions[currentIndex];
    if (submission.user_id === user.id) {
      Alert.alert('Cannot Vote', "You can't vote on your own submission!");
      return;
    }

    setVoting(true);
    try {
      // Insert vote
      const { error: voteError } = await supabase.from('submission_votes').insert({
        submission_id: submission.id,
        voter_id: user.id,
        vote_type: vote,
      });

      if (voteError) throw voteError;

      // Update vote counts
      const newStomped = vote === 'stomped' ? submission.stomped_votes + 1 : submission.stomped_votes;
      const newBail = vote === 'bail' ? submission.bail_votes + 1 : submission.bail_votes;

      // Check auto-approve/reject
      let newStatus = 'pending';
      if (newStomped >= 10) newStatus = 'approved';
      if (newBail >= 3) newStatus = 'rejected';

      await supabase
        .from('challenge_submissions')
        .update({
          stomped_votes: newStomped,
          bail_votes: newBail,
          status: newStatus,
        })
        .eq('id', submission.id);

      // Award XP to voter
      const newVoteCount = votesThisSession + 1;
      const bonusXP = newVoteCount % 5 === 0 ? 50 : 0;
      const totalXP = 10 + bonusXP;

      const { data: profile } = await supabase
        .from('profiles')
        .select('xp')
        .eq('id', user.id)
        .single();

      if (profile) {
        await supabase
          .from('profiles')
          .update({ xp: (profile.xp || 0) + totalXP })
          .eq('id', user.id);
      }

      setVotesThisSession(newVoteCount);
      setXpEarned(xpEarned + totalXP);

      if (bonusXP > 0) {
        Alert.alert('Bonus!', `+${bonusXP} XP bonus for 5 votes!`, [{ text: 'Nice!' }]);
      }

      // Move to next submission
      if (currentIndex < submissions.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        Alert.alert('All Done!', `You've reviewed all submissions!\n\nTotal XP earned: ${xpEarned + totalXP}`, [
          { text: 'Awesome!', onPress: () => fetchPendingSubmissions() },
        ]);
      }
    } catch (error: any) {
      console.error('Error voting:', error);
      if (error.code === '23505') {
        Alert.alert('Already Voted', "You've already voted on this submission!");
      } else {
        Alert.alert('Error', 'Failed to submit vote. Please try again.');
      }
    } finally {
      setVoting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#d2673d" />
      </View>
    );
  }

  if (submissions.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>No submissions to review!</Text>
        <Text style={styles.emptySubtext}>Check back later</Text>
      </View>
    );
  }

  const currentSubmission = submissions[currentIndex];

  return (
    <View style={styles.container}>
      {/* Video Player */}
      <Video
        ref={videoRef}
        source={{ uri: currentSubmission.video_url }}
        style={styles.video}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping
        useNativeControls={false}
      />

      {/* Overlay Info */}
      <View style={styles.overlay}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Judge's Booth</Text>
          <Text style={styles.progressText}>
            {currentIndex + 1} / {submissions.length}
          </Text>
        </View>

        {/* Submission Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.username}>@{currentSubmission.username}</Text>
          <Text style={styles.challengeText}>{currentSubmission.challenge_description}</Text>
          {currentSubmission.description && (
            <Text style={styles.description}>{currentSubmission.description}</Text>
          )}
          <View style={styles.voteStats}>
            <Text style={styles.voteStat}>👍 {currentSubmission.stomped_votes}</Text>
            <Text style={styles.voteStat}>👎 {currentSubmission.bail_votes}</Text>
          </View>
        </View>

        {/* Vote Buttons */}
        <View style={styles.voteContainer}>
          <TouchableOpacity
            style={[styles.voteButton, styles.bailButton]}
            onPress={() => handleVote('bail')}
            disabled={voting}
          >
            <Text style={styles.voteButtonText}>BAIL</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.voteButton, styles.stompedButton]}
            onPress={() => handleVote('stomped')}
            disabled={voting}
          >
            <Text style={styles.voteButtonText}>STOMPED</Text>
          </TouchableOpacity>
        </View>

        {/* XP Tracker */}
        <View style={styles.xpTracker}>
          <Text style={styles.xpText}>
            Votes: {votesThisSession} | XP: +{xpEarned}
          </Text>
        </View>
      </View>

      {voting && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width,
    height,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  progressText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  infoContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 16,
    borderRadius: 12,
  },
  username: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d2673d',
    marginBottom: 8,
  },
  challengeText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#ddd',
    marginBottom: 12,
  },
  voteStats: {
    flexDirection: 'row',
    gap: 20,
  },
  voteStat: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  voteContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 16,
  },
  voteButton: {
    flex: 1,
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bailButton: {
    backgroundColor: '#ef4444',
  },
  stompedButton: {
    backgroundColor: '#10b981',
  },
  voteButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  xpTracker: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'center',
  },
  xpText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4ade80',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
  },
});
