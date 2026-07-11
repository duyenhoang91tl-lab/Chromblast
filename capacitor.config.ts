import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.duyenhoang91tl.chromblast',
  appName: 'ChromaBlast',
  webDir: 'www',
  bundledWebRuntime: false,
  android: {
    allowMixedContent: false,
    backgroundColor: '#1a1a2e'
  }
};

export default config;
