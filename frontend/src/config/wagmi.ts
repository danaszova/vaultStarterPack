import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
    metaMaskWallet,
    rainbowWallet,
    walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { avalancheFuji, sepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
    appName: 'Proxy Vault System',
    projectId: '3a8170812b534d0ff9d794f19a901d64', // Public testing ID
    chains: [avalancheFuji, sepolia],
    wallets: [
        {
            groupName: 'Recommended',
            wallets: [metaMaskWallet],
        },
        {
            groupName: 'Other Wallets',
            wallets: [rainbowWallet, walletConnectWallet],
        },
    ],
    ssr: true,
});
