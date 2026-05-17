import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aquaintelligence.app',
  appName: '智渔云',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
