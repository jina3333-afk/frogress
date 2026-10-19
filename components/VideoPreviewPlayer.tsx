import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';

interface Props {
  uri: string;
  style?: StyleProp<ViewStyle>;
  loop?: boolean;
  autoPlay?: boolean;
  nativeControls?: boolean;
  /** 영상이 끝까지 재생됐을 때 호출된다 (loop=false일 때만 의미가 있음). */
  onEnd?: () => void;
}

export function VideoPreviewPlayer({
  uri,
  style,
  loop = true,
  autoPlay = true,
  nativeControls = true,
  onEnd,
}: Props) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = loop;
    if (autoPlay) p.play();
  });

  useEffect(() => {
    if (!onEnd) return;
    const subscription = player.addListener('playToEnd', onEnd);
    return () => subscription.remove();
  }, [player, onEnd]);

  return (
    <VideoView
      player={player}
      style={style}
      nativeControls={nativeControls}
      contentFit="contain"
    />
  );
}
