import React, { useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { VideoSource, VideoView, useVideoPlayer } from 'expo-video';

export const ResizeMode = {
  CONTAIN: 'contain',
  COVER: 'cover',
  STRETCH: 'fill',
} as const;

type ResizeModeValue = (typeof ResizeMode)[keyof typeof ResizeMode];

interface VideoProps {
  source: VideoSource;
  style?: StyleProp<ViewStyle>;
  resizeMode?: ResizeModeValue;
  shouldPlay?: boolean;
  isLooping?: boolean;
  isMuted?: boolean;
  useNativeControls?: boolean;
}

/** SDK 57 video adapter backed by expo-video (expo-av was removed in SDK 55). */
export function Video({
  source,
  style,
  resizeMode = ResizeMode.CONTAIN,
  shouldPlay = false,
  isLooping = false,
  isMuted = false,
  useNativeControls = false,
}: VideoProps) {
  const player = useVideoPlayer(source, instance => {
    instance.loop = isLooping;
    instance.muted = isMuted;
    if (shouldPlay) instance.play();
  });

  useEffect(() => {
    player.loop = isLooping;
    player.muted = isMuted;
    if (shouldPlay) player.play();
    else player.pause();
  }, [isLooping, isMuted, player, shouldPlay]);

  return (
    <VideoView
      player={player}
      style={style}
      contentFit={resizeMode}
      nativeControls={useNativeControls}
    />
  );
}
