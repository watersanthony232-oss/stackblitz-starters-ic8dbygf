import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Must be unique on the App Store; change it before your first upload if you prefer another ID.
  appId: 'io.github.watersanthony232.fillkin',
  appName: 'Fillkin',
  webDir: 'dist',
  ios: {
    contentInset: 'never',
  },
};

export default config;
