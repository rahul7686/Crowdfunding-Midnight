/**
 * Tiny bridge so UI chrome outside of WalletConnect (e.g. the navbar wallet
 * chip/button) can trigger wallet actions that are handled by the useMidnight
 * hook. This keeps the wallet connection logic owned by WalletConnect /
 * useMidnight — this module only forwards *requests* and lightweight status
 * notifications.
 */

let disconnectHandler: (() => void) | null = null;
let connectHandler: (() => void) | null = null;
let connectingListener: ((connecting: boolean) => void) | null = null;

export const registerDisconnectHandler = (handler: () => void): void => {
  disconnectHandler = handler;
};

export const unregisterDisconnectHandler = (): void => {
  disconnectHandler = null;
};

export const requestWalletDisconnect = (): void => {
  disconnectHandler?.();
};

export const registerConnectHandler = (handler: () => void): void => {
  connectHandler = handler;
};

export const unregisterConnectHandler = (): void => {
  connectHandler = null;
};

export const requestWalletConnect = (): void => {
  connectHandler?.();
};

export const registerConnectingListener = (
  listener: (connecting: boolean) => void,
): void => {
  connectingListener = listener;
};

export const unregisterConnectingListener = (): void => {
  connectingListener = null;
};

export const notifyConnecting = (connecting: boolean): void => {
  connectingListener?.(connecting);
};
