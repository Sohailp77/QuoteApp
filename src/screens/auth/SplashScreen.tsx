import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Colors } from '../../theme';

export const SplashScreen: React.FC = () => {
  const opacity = new Animated.Value(0);
  const scale = new Animated.Value(0.8);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoWrap, { opacity, transform: [{ scale }] }]}>
        <View style={styles.logoBox}>
          <Text style={styles.logoIcon}>Q</Text>
        </View>
        <Text style={styles.appName}>QuoteApp</Text>
        <Text style={styles.tagline}>Smart Quoting. Faster Deals.</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: { alignItems: 'center', gap: 16 },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  logoIcon: { fontSize: 40, fontWeight: '800', color: '#fff' },
  appName: { fontSize: 32, fontWeight: '800', color: '#fff', letterSpacing: -1 },
  tagline: { fontSize: 14, color: 'rgba(255,255,255,0.6)', letterSpacing: 0.5 },
});
