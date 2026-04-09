import React, { useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView, TextInput, Alert } from 'react-native';
import { Flag, X } from 'lucide-react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { moderationService } from '../lib/moderationService';
import Card from './ui/Card';
import { Logger } from '../lib/logger';

interface ReportButtonProps {
  reportedUserId: string;
  reportedUserName?: string;
  contextType?: 'message' | 'post' | 'profile' | 'review';
  contextId?: string;
}

const REPORT_TYPES = [
  { value: 'abuse', label: 'Abuse or Harassment' },
  { value: 'harassment', label: 'Threatening or Harassing Behavior' },
  { value: 'inappropriate_content', label: 'Inappropriate Content' },
  { value: 'fraud', label: 'Fraud or Scam' },
  { value: 'spam', label: 'Spam' },
  { value: 'other', label: 'Other' },
];

export default function ReportButton({
  reportedUserId,
  reportedUserName = 'User',
  contextType,
  contextId,
}: ReportButtonProps) {
  const { user } = useAuthStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedType, setSelectedType] = useState('abuse');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitReport = async () => {
    if (!user?.id || !reason.trim()) {
      Alert.alert('Error', 'Please provide a reason for your report');
      return;
    }

    setSubmitting(true);
    try {
      await moderationService.reportUser(
        user.id,
        reportedUserId,
        selectedType,
        reason,
        contextType,
        contextId
      );

      Alert.alert('Report Submitted', 'Thank you for helping keep SkateQuest safe. Our team will review your report shortly.');
      setModalVisible(false);
      setReason('');
      setSelectedType('abuse');
    } catch (error) {
      Logger.error('Failed to submit report', error);
      Alert.alert('Error', 'Failed to submit report. Please try again later.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Report Button */}
      <Pressable
        onPress={() => setModalVisible(true)}
        className="flex-row items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20"
        hitSlop={8}
      >
        <Flag size={16} color="#EF4444" strokeWidth={2} />
        <Text className="text-xs font-semibold text-red-600 dark:text-red-400">Report</Text>
      </Pressable>

      {/* Report Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-black/50">
          <View className="flex-1 bg-white dark:bg-gray-900 mt-20 rounded-t-3xl">
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-700">
              <Text className="text-lg font-bold text-gray-900 dark:text-white">Report User</Text>
              <Pressable
                onPress={() => setModalVisible(false)}
                hitSlop={8}
              >
                <X size={24} color="#666" strokeWidth={2} />
              </Pressable>
            </View>

            <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={false}>
              {/* Reported User Info */}
              <Card className="mb-4">
                <View>
                  <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">Reporting</Text>
                  <Text className="text-base font-semibold text-gray-900 dark:text-white">
                    {reportedUserName}
                  </Text>
                </View>
              </Card>

              {/* Report Type Selection */}
              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  What's the issue?
                </Text>
                {REPORT_TYPES.map((type) => (
                  <Pressable
                    key={type.value}
                    onPress={() => setSelectedType(type.value)}
                    className={`px-3 py-3 rounded-lg mb-2 flex-row items-center ${
                      selectedType === type.value
                        ? 'bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700'
                        : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <View
                      className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${
                        selectedType === type.value
                          ? 'border-red-600 bg-red-600'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {selectedType === type.value && (
                        <View className="w-2 h-2 bg-white rounded-full" />
                      )}
                    </View>
                    <Text
                      className={`font-medium ${
                        selectedType === type.value
                          ? 'text-red-700 dark:text-red-300'
                          : 'text-gray-900 dark:text-gray-200'
                      }`}
                    >
                      {type.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Reason Input */}
              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Additional context (required)
                </Text>
                <TextInput
                  className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-3 rounded-lg border border-gray-300 dark:border-gray-600"
                  placeholder="Describe the issue in detail..."
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={5}
                  maxLength={1000}
                  value={reason}
                  onChangeText={setReason}
                  editable={!submitting}
                />
                <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
                  {reason.length}/1000
                </Text>
              </View>

              {/* Agreement text */}
              <Card className="mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <Text className="text-xs text-blue-800 dark:text-blue-200">
                  By submitting this report, you agree that the information you provide is accurate and complete. False reports may result in account restrictions.
                </Text>
              </Card>
            </ScrollView>

            {/* Action Buttons */}
            <View className="px-4 py-4 gap-3 border-t border-gray-200 dark:border-gray-700 flex-row">
              <Pressable
                onPress={() => setModalVisible(false)}
                disabled={submitting}
                className="flex-1 px-4 py-3 rounded-lg bg-gray-200 dark:bg-gray-800 items-center"
              >
                <Text className="font-semibold text-gray-900 dark:text-white">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSubmitReport}
                disabled={submitting || !reason.trim()}
                className={`flex-1 px-4 py-3 rounded-lg items-center ${
                  submitting || !reason.trim()
                    ? 'bg-red-300 dark:bg-red-900/50'
                    : 'bg-red-600 active:bg-red-700'
                }`}
              >
                <Text className="font-semibold text-white">
                  {submitting ? 'Submitting...' : 'Submit Report'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
