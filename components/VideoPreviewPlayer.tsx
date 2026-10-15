import { useVideoPlayer, VideoView } from 'expo-video';
import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';

interface Props {
  uri: string;
  style?: StyleProp<ViewStyle>;
  loop?: boolean;
  autoPlay?: boolean;
}

export function VideoPreviewPlayer({ uri, style, loop = true, autoPlay = true }: Props) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = loop;
    if (autoPlay) p.play();
  });
  return <VideoView player={player} style={style} nativeControls contentFit="contain" />;
}
