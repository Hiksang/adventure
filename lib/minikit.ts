import { MiniKit } from '@worldcoin/minikit-js';
import { IS_DEV, APP_ID } from './env';

export const initMiniKit = () => {
  if (typeof window === 'undefined') return;
  if (!IS_DEV) {
    MiniKit.install(APP_ID);
  }
};

export const isMiniKitReady = () => {
  if (IS_DEV) return true;
  return MiniKit.isInstalled();
};
