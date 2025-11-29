# Cross-Chain Strategy Vault

**Automate your crypto assets across blockchains without the headache.**

Think of this project as a **"Smart Piggy Bank"** that can automatically move your money to the right place at the right time. You set the rules, and the vault handles the rest—securely and automatically.

---

## 🌟 Why Use This?

Managing crypto across different blockchains is complicated. You have to bridge funds, watch gas prices, and remember to execute trades. **Cross-Chain Strategy Vault** solves this by letting you "set and forget" your investment strategies.

### ✅ Key Benefits
- **Automated**: Once you create a vault, it runs itself. No need to wake up at 3 AM to make a trade.
- **Cross-Chain**: It works like a universal bank account. Move funds from a high-speed network (like Arbitrum) to a secure savings network (like Ethereum) automatically.
- **Secure**: You stay in control. Your funds are locked in a smart contract that only executes exactly what you told it to do.

---

## 💡 Use Cases

Here are a few ways you can use this system:

### 1. The "HODL" Lock 🔒
**Problem**: You want to hold Bitcoin or Ethereum for the long term, but you're tempted to sell when the price drops.
**Solution**: Create a vault that locks your tokens for 1 year. The system literally *cannot* let you withdraw until the time is up. It forces you to stick to your plan.

### 2. Cross-Chain Savings 💸
**Problem**: You earn high yields on a newer blockchain (like Base), but you want to keep your savings on the main Ethereum network for safety.
**Solution**: Set a rule: "Every month, move 50% of my profits from Base to Ethereum." The vault automatically bridges the funds for you.

### 3. The Trust Fund 🎓
**Problem**: You want to give crypto to your children, but only when they turn 18.
**Solution**: Create a vault with a "Time Lock" that expires on their 18th birthday. Until then, the funds are safe and growing, but inaccessible.

---

## 🚀 How It Works

1.  **Create a Vault**: You deploy a personal "vault" (a smart contract) and deposit your tokens.
2.  **Set the Rules**: You define *what* should happen (e.g., "Move 100 USDC") and *when* (e.g., "After 30 days").
3.  **Relax**: The system monitors the conditions. When the time is right, it executes the strategy automatically.

---

## 👨‍💻 For Developers

Below is the technical documentation for deploying and testing the system.

### Prerequisites
1. **Node.js** (v18 or higher)
2. **Testnet ETH** (Sepolia, Arbitrum Sepolia)
3. **RPC URLs** (Infura/Alchemy)

### Installation
```bash
# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test
```

### Architecture
- **StrategyVault**: The core contract holding funds and logic.
- **StrategyFactory**: A factory to easily deploy new vaults.
- **Cross-Chain (CCIP)**: Uses Chainlink CCIP for secure cross-chain messaging.

### Testing
The system is fully tested with **92%+ code coverage**.
```bash
npx hardhat test
```

### Supported Networks
- **Testnets**: Sepolia, Arbitrum Sepolia, Base Sepolia
- **Mainnets**: Ethereum, Arbitrum, Optimism, Base, Polygon

---

**License**: MIT
**Status**: Beta (Testnet)
