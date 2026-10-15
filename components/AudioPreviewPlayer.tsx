import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Pause, Play } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatDuration } from '../lib/format';
import { colors, fonts, spacing } from '../theme';

interface Props {
  uri: string;
}

export function AudioPreviewPlayer({ uri }: Props) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => (status.playing ? player.pause() : player.play())}
        style={styles.playButton}
      >
        {status.playing ? (
          <Pause size={28} color={colors.surface} strokeWidth={2.2} />
        ) : (
          <Play size={28} color={colors.surface} strokeWidth={2.2} />
        )}
      </Pressable>
      <Text style={styles.time}>
        {formatDuration(status.currentTime * 1000)} / {formatDuration(status.duration * 1000)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  time: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.textMuted,
  },
});
