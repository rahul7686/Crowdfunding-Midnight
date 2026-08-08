/**
 * Tiny bridge so UI chrome outside of WalletConnect (e.g. the navbar wallet
 * dropdown) can trigger the wallet disconnection handled by the useMidnight
 * hook. This keeps the wallet connection logic owned by WalletConnect /
 * useMidnight — this module only forwards a disconnect *request*.
 */

let disconnectHandler: (() => void) | null = null;

export const registerDisconnectHandler = (handler: () => void): void => {
  disconnectHandler = handler;
};

export const unregisterDisconnectHandler = (): void => {
  disconnectHandler = null;
};

export const requestWalletDisconnect = (): void => {
  disconnectHandler?.();
};
