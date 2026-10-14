import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Same ID as the Android app, so both stores list the same Simple Zone.
  appId: 'com.auroraglance.simplezone',
  appName: 'Simple Zone',
  webDir: 'dist',
  ios: {
    contentInset: 'never',
  },
};

export default config;
