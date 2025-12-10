import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING } from '../constants/theme';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    title: 'Emergency Help\nWhen It Matters Most 🚨',
    subtitle: 'Step-by-step guidance for any\npet emergency, powered by AI',
    emoji: '🐕❤️',
    colors: ['#FFF5F0', '#FFE8DC'],
  },
  {
    id: '2',
    title: 'Smart. Fast. Reliable. 💡',
    features: [
      '✚ AI Emergency Assistant',
      '🍎 Unlimited Food Safety',
      '📍 Find Nearby Vets',
      '📅 Smart Health Reminders',
    ],
    emoji: '🎯',
    colors: ['#F0F8FF', '#E0EFFF'],
  },
  {
    id: '3',
    title: "Your Pet's Guardian\nIs Ready 🐾",
    subtitle: 'Join 10,000+ pet parents who trust\nPawGuard for their pet\'s safety',
    emoji: '🛡️',
    colors: ['#F0FFF4', '#E0FFE8'],
  },
];

export default function OnboardingScreen({ navigation }) {
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (event) => {
        const index = Math.round(event.nativeEvent.contentOffset.x / width);
        setCurrentIndex(index);
      },
    }
  );

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      scrollViewRef.current?.scrollTo({
        x: (currentIndex + 1) * width,
        animated: true,
      });
    } else {
      navigation.navigate('Subscription');
    }
  };

  const handleSkip = () => {
    navigation.navigate('Subscription');
  };

  const renderSlide = (item, index) => {
    const inputRange = [
      (index - 1) * width,
      index * width,
      (index + 1) * width,
    ];

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.8, 1, 0.8],
      extrapolate: 'clamp',
    });

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.3, 1, 0.3],
      extrapolate: 'clamp',
    });

    return (
      <LinearGradient
        key={item.id}
        colors={item.colors}
        style={styles.slide}
      >
        <Animated.View style={[styles.contentContainer, { opacity, transform: [{ scale }] }]}>
          <Text style={styles.emoji}>{item.emoji}</Text>
          
          <Text style={styles.title}>{item.title}</Text>

          {item.subtitle && (
            <Text style={styles.subtitle}>{item.subtitle}</Text>
          )}

          {item.features && (
            <View style={styles.featuresContainer}>
              {item.features.map((feature, i) => (
                <Animated.Text
                  key={i}
                  style={[
                    styles.feature,
                    {
                      opacity: scrollX.interpolate({
                        inputRange,
                        outputRange: [0, 1, 0],
                        extrapolate: 'clamp',
                      }),
                      transform: [{
                        translateY: scrollX.interpolate({
                          inputRange,
                          outputRange: [50, 0, 50],
                          extrapolate: 'clamp',
                        }),
                      }],
                    },
                  ]}
                >
                  {feature}
                </Animated.Text>
              ))}
            </View>
          )}
        </Animated.View>
      </LinearGradient>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Skip Button */}
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Slides */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {SLIDES.map((slide, index) => renderSlide(slide, index))}
      </ScrollView>

      {/* Pagination Dots */}
      <View style={styles.pagination}>
        {SLIDES.map((_, index) => {
          const opacity = scrollX.interpolate({
            inputRange: [
              (index - 1) * width,
              index * width,
              (index + 1) * width,
            ],
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={index}
              style={[styles.dot, { opacity }]}
            />
          );
        })}
      </View>

      {/* Next Button */}
      <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
        <Text style={styles.nextButtonText}>
          {currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  slide: {
    width,
    paddingHorizontal: SPACING.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    alignItems: 'center',
    paddingTop: 100,
  },
  emoji: {
    fontSize: 80,
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: FONTS.sizes.xxxl,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.md,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: SPACING.md,
  },
  featuresContainer: {
    marginTop: SPACING.xl,
    alignItems: 'flex-start',
  },
  feature: {
    fontSize: FONTS.sizes.lg,
    color: COLORS.text,
    marginVertical: SPACING.sm,
    fontWeight: '600',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
    marginHorizontal: 4,
  },
  nextButton: {
    backgroundColor: COLORS.primary,
    marginHorizontal: SPACING.xl,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: SPACING.xl,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: FONTS.sizes.lg,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
