import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sobrick.app',
  appName: 'SóBrick',
  webDir: 'dist',
  // @ts-ignore
  icon: 'resources/icone.png',
  android: {
    // @ts-ignore
    signing: {
      path: 'android/my-release-key.keystore',
      alias: 'alias_name',
      storePassword: 'Douglas22%',
      keyPassword: 'Douglas22%'
    }
  }
};

export default config;
