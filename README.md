# Cross-Chain Strategy Vault 🏦

**Automate your crypto assets across blockchains without the headache.**

Think of this project as a **"Smart Piggy Bank"** that can automatically move your money to the right place at the right time. You set the rules, and the vault handles the rest—securely and automatically.

---

## 🚀 Quick Start (Get Running in 5 Minutes)

Follow these steps to get the project running on your local machine.

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **MetaMask** (Browser Extension)
- **Avalanche Fuji Testnet** added to MetaMask ([Chainlist](https://chainlist.org/?testnets=true&search=fuji))

### 2. Clone & Install
```bash
# Clone the repository
git clone https://github.com/danaszova/vaultStarterPack.git
cd vaultStarterPack

# Install root dependencies (Hardhat, Smart Contracts)
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 3. Configure Environment
Create a `.env` file in the root directory:
```bash
cp .env.example .env
```
Open `.env` and add your details:
- `PRIVATE_KEY`: Your wallet private key (Use a **TEST WALLET** only!).
- `AVALANCHE_FUJI_RPC_URL`: Get a free RPC URL from [Infura](https://infura.io) or [Alchemy](https://alchemy.com).

### 4. Run the Frontend
```bash
cd frontend
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🎮 How to Use the App

### 1. Get Free Test Tokens 🪙
You don't need real money!
1.  Go to the **Faucet** page (link in top nav).
2.  Click **"Mint 1000 DANA"**.
3.  Add the DANA token to MetaMask using the address shown on screen.

### 2. Create a Vault 🔒
1.  Go to the **Vaults** page.
2.  Enter a **Vault Name** (e.g., "My Savings").
3.  Set a **Target Execution Amount** (e.g., 100 DANA).
4.  Set a **Lock Period** (e.g., 60 seconds).
5.  Click **Create Vault**.

### 3. Deposit & Execute 💸
1.  Click **Deposit** on your new vault card.
2.  Approve and Deposit your DANA tokens.
3.  Once the **Target Amount** is reached and **Lock Period** passes, the status will change.
4.  Click **Execute Strategy** to simulate the cross-chain move!

---

## 💡 Use Cases

### 1. The "HODL" Lock 🔒
**Problem**: You want to hold Bitcoin or Ethereum for the long term, but you're tempted to sell when the price drops.
**Solution**: Create a vault that locks your tokens for 1 year. The system literally *cannot* let you withdraw until the time is up.

### 2. Cross-Chain Savings 💸
**Problem**: You earn high yields on a newer blockchain (like Base), but you want to keep your savings on the main Ethereum network for safety.
**Solution**: Set a rule: "Every month, move 50% of my profits from Base to Ethereum."

### 3. The Trust Fund 🎓
**Problem**: You want to give crypto to your children, but only when they turn 18.
**Solution**: Create a vault with a "Time Lock" that expires on their 18th birthday.

---

## 👨‍💻 For Developers

### Project Structure
- `contracts/`: Solidity smart contracts (Hardhat).
- `frontend/`: Next.js web application.
- `scripts/`: Deployment and utility scripts.
- `test/`: Automated test suite.

### Running Tests
The system is fully tested with **92%+ code coverage**.
```bash
npx hardhat test
```

### Architecture
- **StrategyVault**: The core contract holding funds and logic.
- **StrategyFactory**: A factory to easily deploy new vaults.
- **Cross-Chain (CCIP)**: Uses Chainlink CCIP for secure cross-chain messaging.

---

**License**: MIT
**Status**: Beta (Testnet)
