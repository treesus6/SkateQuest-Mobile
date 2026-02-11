import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { ThumbsUp, ThumbsDown } from 'lucide-react-native';
import { challengesService } from '../lib/challengesService';
import { profilesService } from '../lib/profilesService';
import { useAuthStore } from '../stores/useAuthStore';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';

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
  const { user } = useAuthStore();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [votesThisSession, setVotesThisSession] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const videoRef = useRef<Video>(null);

  useEffect(() => { fetchPendingSubmissions(); }, []);

  const fetchPendingSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('challenge_submissions')
        .select(`*, profiles!challenge_submissions_user_id_fkey(username), challenges!challenge_submissions_challenge_id_fkey(description)`)
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
    } catch (error) { console.error('Error fetching submissions:', error); }
    finally { setLoading(false); }
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
      const { error: voteError } = await challengesService.vote(submission.id, user.id, vote);
      if (voteError) throw voteError;

      const newStomped = vote === 'stomped' ? submission.stomped_votes + 1 : submission.stomped_votes;
      const newBail = vote === 'bail' ? submission.bail_votes + 1 : submission.bail_votes;

      let newStatus = 'pending';
      if (newStomped >= 10) newStatus = 'approved';
      if (newBail >= 3) newStatus = 'rejected';

      await challengesService.updateSubmission(submission.id, { stomped_votes: newStomped, bail_votes: newBail, status: newStatus });

      const newVoteCount = votesThisSession + 1;
      const bonusXP = newVoteCount % 5 === 0 ? 50 : 0;
      const totalXP = 10 + bonusXP;

      const { data: profile } = await profilesService.getById(user.id);
      if (profile) {
        await profilesService.update(user.id, { xp: (profile.xp || 0) + totalXP });
      }

      setVotesThisSession(newVoteCount);
      setXpEarned(xpEarned + totalXP);

      if (bonusXP > 0) Alert.alert('Bonus!', `+${bonusXP} XP bonus for 5 votes!`);

      if (currentIndex < submissions.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        Alert.alert('All Done!', `You've reviewed all submissions!\n\nTotal XP earned: ${xpEarned + totalXP}`, [
          { text: 'Awesome!', onPress: () => fetchPendingSubmissions() },
        ]);
      }
    } catch (error: any) {
      if (error.code === '23505') Alert.alert('Already Voted', "You've already voted on this submission!");
      else Alert.alert('Error', 'Failed to submit vote. Please try again.');
    } finally { setVoting(false); }
  };

  if (loading) {
    return (<View className="flex-1 bg-gray-900 justify-center items-center"><LoadingSkeleton height={400} className="mx-4" /></View>);
  }

  if (submissions.length === 0) {
    return (
      <View className="flex-1 bg-gray-900 justify-center items-center">
        <Text className="text-lg font-bold text-white mb-2">No submissions to review!</Text>
        <Text className="text-sm text-gray-500">Check back later</Text>
      </View>
    );
  }

  const currentSubmission = submissions[currentIndex];

  return (
    <View className="flex-1 bg-black">
      <Video ref={videoRef} source={{ uri: currentSubmission.video_url }} style={{ width, height }} resizeMode={ResizeMode.COVER} shouldPlay isLooping useNativeControls={false} />

      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'space-between', paddingTop: 60, paddingBottom: 40, paddingHorizontal: 20 }}>
        <View className="flex-row justify-between items-center">
          <Text className="text-2xl font-bold text-white" style={{ textShadowColor: 'rgba(0,0,0,0.75)', textShadowOffset: { width: -1, height: 1 }, textShadowRadius: 10 }}>Judge's Booth</Text>
          <Text className="text-base text-white font-semibold" style={{ textShadowColor: 'rgba(0,0,0,0.75)', textShadowOffset: { width: -1, height: 1 }, textShadowRadius: 10 }}>
            {currentIndex + 1} / {submissions.length}
          </Text>
        </View>

        <View className="bg-black/60 p-4 rounded-xl">
          <Text className="text-lg font-bold text-brand-terracotta mb-2">@{currentSubmission.username}</Text>
          <Text className="text-base text-white font-semibold mb-1">{currentSubmission.challenge_description}</Text>
          {currentSubmission.description && <Text className="text-sm text-gray-300 mb-3">{currentSubmission.description}</Text>}
          <View className="flex-row gap-5">
            <View className="flex-row items-center gap-1"><ThumbsUp color="#4ade80" size={16} /><Text className="text-sm text-white font-semibold">{currentSubmission.stomped_votes}</Text></View>
            <View className="flex-row items-center gap-1"><ThumbsDown color="#ef4444" size={16} /><Text className="text-sm text-white font-semibold">{currentSubmission.bail_votes}</Text></View>
          </View>
        </View>

        <View className="flex-row justify-around gap-4">
          <TouchableOpacity className="flex-1 bg-red-500 py-5 rounded-xl items-center justify-center" onPress={() => handleVote('bail')} disabled={voting}>
            <Text className="text-xl font-bold text-white">BAIL</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-1 bg-emerald-500 py-5 rounded-xl items-center justify-center" onPress={() => handleVote('stomped')} disabled={voting}>
            <Text className="text-xl font-bold text-white">STOMPED</Text>
          </TouchableOpacity>
        </View>

        <View className="bg-black/70 py-2 px-4 rounded-full self-center">
          <Text className="text-sm font-bold text-green-400">Votes: {votesThisSession} | XP: +{xpEarned}</Text>
        </View>
      </View>

      {voting && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}
    </View>
  );
}
