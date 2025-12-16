// Supported Tokens for Faucet and Vault Creation
export const SUPPORTED_TOKENS = {
  DANA: {
    address: '0xA729fCc582e0c0150C94e4e68319fF3D0aab3edb', // MockERC20 (DANA) deployed with proxy system
    name: 'DANA Test Token',
    symbol: 'DANA',
    decimals: 6,
  },
  USDC_T: {
    address: '0x6a75237B2609f08BA08693519F857dFFe18793a5', // USDC_T Test Token
    name: 'USDC Test Token',
    symbol: 'USDC_T',
    decimals: 6,
  },
} as const;

export type TokenSymbol = keyof typeof SUPPORTED_TOKENS;

// Avalanche Fuji testnet addresses (from deployment on 2025-12-10)
export const PROXY_SYSTEM_FUJI = {
  VaultProxyFactory: '0x0cD47DE2f7d716b0b52c7C0a83Fbc563ee115838',
  StrategyVaultImplementation: '0x720FDAa0B171CA358f18D1e71Df7473A55DEb2D1',
  TimeLockRule: '0x181754E8E0603c2C735b14b907B92156DeC9595E',
  PriceRule: '0xe594075cA42F6832683F38b2FB04aA91aa73AA5F',
  PerformanceRule: '0x49E9D7C46C7B990EE1c880A549be2d95DB1e8BFD',
  MockERC20: '0xA729fCc582e0c0150C94e4e68319fF3D0aab3edb',
  MockChainlinkAggregator: '0xd2b05B064413513D855cBA2eeB587f2B3Dc2483D',
};
