import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aquaintelligence.app',
  appName: '智渔云',
  webDir: 'dist',
  server: {
    url: "https://azen07.github.io/zhiyuyun/",
    androidScheme: 'https'
  },
  plugins:{}
};

export default config;
