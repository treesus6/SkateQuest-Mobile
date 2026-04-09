import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react-native';
import Card from './ui/Card';

interface ChangelogItemProps {
  version: string;
  title: string;
  releaseDate: string;
  description?: string;
  features?: string[];
  bugFixes?: string[];
  knownIssues?: string[];
  isCritical?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
}

export default function ChangelogItem({
  version,
  title,
  releaseDate,
  description,
  features = [],
  bugFixes = [],
  knownIssues = [],
  isCritical = false,
  expanded = false,
  onToggle,
}: ChangelogItemProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Card
      className={isCritical ? 'border-l-4 border-red-500' : ''}
    >
      <Pressable onPress={onToggle} className="gap-3">
        {/* Header */}
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <View className="flex-row items-center gap-2 mb-1">
              <Text className="text-lg font-bold text-gray-900 dark:text-white">
                v{version}
              </Text>
              {isCritical && (
                <View className="px-2 py-1 bg-red-100 dark:bg-red-900/30 rounded-full flex-row items-center gap-1">
                  <AlertTriangle size={12} color="#EF4444" strokeWidth={2} />
                  <Text className="text-xs font-bold text-red-700 dark:text-red-300">
                    Critical
                  </Text>
                </View>
              )}
            </View>
            <Text className="text-base font-semibold text-gray-900 dark:text-white">
              {title}
            </Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {formatDate(releaseDate)}
            </Text>
          </View>
          {onToggle && (
            <View className="pl-2">
              {expanded ? (
                <ChevronUp size={24} color="#d2673d" strokeWidth={2} />
              ) : (
                <ChevronDown size={24} color="#d2673d" strokeWidth={2} />
              )}
            </View>
          )}
        </View>

        {/* Description (always visible) */}
        {description && (
          <Text className="text-sm text-gray-600 dark:text-gray-300">{description}</Text>
        )}

        {/* Expanded content */}
        {expanded && (
          <View className="mt-2 gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            {/* Features */}
            {features.length > 0 && (
              <View>
                <View className="flex-row items-center gap-2 mb-2">
                  <View className="w-2 h-2 rounded-full bg-green-500" />
                  <Text className="text-sm font-semibold text-gray-900 dark:text-white">
                    New Features
                  </Text>
                </View>
                {features.map((feature, idx) => (
                  <Text
                    key={idx}
                    className="text-sm text-gray-700 dark:text-gray-300 ml-4 mb-1"
                  >
                    • {feature}
                  </Text>
                ))}
              </View>
            )}

            {/* Bug Fixes */}
            {bugFixes.length > 0 && (
              <View>
                <View className="flex-row items-center gap-2 mb-2">
                  <View className="w-2 h-2 rounded-full bg-blue-500" />
                  <Text className="text-sm font-semibold text-gray-900 dark:text-white">
                    Bug Fixes
                  </Text>
                </View>
                {bugFixes.map((fix, idx) => (
                  <Text
                    key={idx}
                    className="text-sm text-gray-700 dark:text-gray-300 ml-4 mb-1"
                  >
                    • {fix}
                  </Text>
                ))}
              </View>
            )}

            {/* Known Issues */}
            {knownIssues.length > 0 && (
              <View>
                <View className="flex-row items-center gap-2 mb-2">
                  <View className="w-2 h-2 rounded-full bg-yellow-500" />
                  <Text className="text-sm font-semibold text-gray-900 dark:text-white">
                    Known Issues
                  </Text>
                </View>
                {knownIssues.map((issue, idx) => (
                  <Text
                    key={idx}
                    className="text-sm text-gray-700 dark:text-gray-300 ml-4 mb-1"
                  >
                    ⚠️ {issue}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}
      </Pressable>
    </Card>
  );
}
