/**
 * Service-worker registration state as runes (NFR offline, FR-10).
 * vite-plugin-pwa injects `virtual:pwa-register`; in dev and tests the
 * registration is a no-op so the banner never shows.
 */
import { registerSW } from 'virtual:pwa-register';

let offlineReady = $state(false);
let needRefresh = $state(false);

const update = import.meta.env.PROD
  ? registerSW({
      immediate: true,
      onOfflineReady() {
        offlineReady = true;
      },
      onNeedRefresh() {
        needRefresh = true;
      },
    })
  : async () => {};

export const pwa = {
  get offlineReady(): boolean {
    return offlineReady;
  },
  get needRefresh(): boolean {
    return needRefresh;
  },
  update(): Promise<void> {
    return update(true);
  },
  dismiss(): void {
    offlineReady = false;
    needRefresh = false;
  },
};
