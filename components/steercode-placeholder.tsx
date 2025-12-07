import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

export default function SteercodePlaceholder() {
  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/images/steercode-bg.png')}
        style={styles.bgImage}
        contentFit="cover"
      />
      <BlurView
        intensity={100}
        tint="dark"
        style={styles.blur}
      />
      <View style={styles.content}>
        <Text style={styles.title}>
          Something amazing starts here
        </Text>
        <Text style={styles.subtitle}>
          This is a SteerCode starting template. Ask AI to make any changes.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  bgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  blur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    gap: 10,
    padding: 20,
    zIndex: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.7)',
  },
});
