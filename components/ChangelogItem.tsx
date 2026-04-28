import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Bug } from 'lucide-react-native';
import Card from './ui/Card';

interface Props {
  version: string; title: string; releaseDate: string;
  description?: string; features?: string[]; bugFixes?: string[];
  knownIssues?: string[]; isCritical: boolean;
  expanded: boolean; onToggle: () => void;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function ChangelogItem({ version, title, releaseDate, description, features, bugFixes, knownIssues, isCritical, expanded, onToggle }: Props) {
  return (
    <Card className={isCritical ? 'border-l-4 border-red-500' : ''}>
      <TouchableOpacity onPress={onToggle} activeOpacity={0.7}>
        <View className="flex-row items-start justify-between">
          <View className="flex-1 mr-3">
            <View className="flex-row items-center gap-2 flex-wrap">
              <View className="bg-brand-terracotta px-2 py-0.5 rounded-full">
                <Text className="text-white text-xs font-bold">v{version}</Text>
              </View>
              {isCritical && (
                <View className="bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full flex-row items-center gap-1">
                  <AlertTriangle size={10} color="#EF4444" />
                  <Text className="text-red-600 text-xs font-bold">Critical</Text>
                </View>
              )}
            </View>
            <Text className="text-base font-bold text-gray-800 dark:text-gray-100 mt-1">{title}</Text>
            <Text className="text-xs text-gray-400 mt-0.5">{formatDate(releaseDate)}</Text>
          </View>
          {expanded ? <ChevronUp color="#9CA3AF" size={20} /> : <ChevronDown color="#9CA3AF" size={20} />}
        </View>
      </TouchableOpacity>

      {expanded && (
        <View className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          {description ? <Text className="text-sm text-gray-600 dark:text-gray-300 mb-3">{description}</Text> : null}

          {features && features.length > 0 && (
            <View className="mb-3">
              <View className="flex-row items-center gap-1.5 mb-1.5">
                <CheckCircle size={14} color="#4CAF50" />
                <Text className="text-sm font-bold text-gray-700 dark:text-gray-200">New Features</Text>
              </View>
              {features.map((f, i) => (
                <Text key={i} className="text-sm text-gray-600 dark:text-gray-300 ml-5 mb-1">• {f}</Text>
              ))}
            </View>
          )}

          {bugFixes && bugFixes.length > 0 && (
            <View className="mb-3">
              <View className="flex-row items-center gap-1.5 mb-1.5">
                <Bug size={14} color="#2196F3" />
                <Text className="text-sm font-bold text-gray-700 dark:text-gray-200">Bug Fixes</Text>
              </View>
              {bugFixes.map((f, i) => (
                <Text key={i} className="text-sm text-gray-600 dark:text-gray-300 ml-5 mb-1">• {f}</Text>
              ))}
            </View>
          )}

          {knownIssues && knownIssues.length > 0 && (
            <View>
              <View className="flex-row items-center gap-1.5 mb-1.5">
                <AlertTriangle size={14} color="#FF9800" />
                <Text className="text-sm font-bold text-gray-700 dark:text-gray-200">Known Issues</Text>
              </View>
              {knownIssues.map((f, i) => (
                <Text key={i} className="text-sm text-gray-600 dark:text-gray-300 ml-5 mb-1">• {f}</Text>
              ))}
            </View>
          )}
        </View>
      )}
    </Card>
  );
}
