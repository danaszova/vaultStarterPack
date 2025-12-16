# Upgradable Proxy Vault System 🏦

**Automated, upgradable strategy vaults with sequential rule execution.**

This project implements a next-generation vault system using **EIP-1167 minimal proxies** for gas-efficient, upgradable vault deployments. Users create vaults with ordered rule chains that execute sequentially, with configurable failsafes and dual fee mechanisms for long-term resilience.

---

## 🚀 Quick Start (Get Running in 5 Minutes)

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
Open `.env` and add:
- `PRIVATE_KEY`: Your wallet private key (Use a **TEST WALLET** only!)
- `AVALANCHE_FUJI_RPC_URL`: Get a free RPC URL from [Infura](https://infura.io) or [Alchemy](https://alchemy.com)

### 4. Run the Frontend
```bash
cd frontend
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🎮 How to Use the App

### 1. Get Free Test Tokens 🪙
1. Go to the **Faucet** page (link in top nav)
2. Click **"Mint 1000 DANA"** (or USDC_T)
3. Add the token to MetaMask using the address shown

### 2. Create a Proxy Vault 🔒
1. Go to the **Vaults** page (main page)
2. Select **Deposit Token** (DANA or USDC_T)
3. Enter an optional **Vault Name**
4. Click **Create Proxy Vault**

**Features included:**
- Upgradable proxy architecture (EIP-1167)
- Three pre-configured rules (TimeLock, Price, Performance)
- 0.1% deposit fee + 2% success fee on profits
- 1-year failsafe timer (no fee on failsafe withdrawal)

### 3. Deposit & Monitor 💸
1. Your vault will appear in the vault list (may require refresh)
2. Click **Deposit** to add tokens
3. Monitor rule progress and vault status
4. Execute rules when conditions are met

---

## 💡 Key Features

### 1. Upgradable Proxy Architecture
- **Gas-efficient**: EIP-1167 minimal proxies reduce deployment costs
- **Upgradable**: Implementation can be upgraded by governance
- **Secure**: 7-day timelock on implementation upgrades

### 2. Sequential Rule Execution
- **Ordered rule chains**: Rules execute in defined sequence
- **Multiple rule types**: TimeLock, Price, Performance rules included
- **Extensible**: Easy to add new rule types via registry system

### 3. Dual Fee Mechanism
- **Deposit fee**: 0.1% charged immediately (funds development)
- **Success fee**: 2% charged only on profits
- **No fee on failsafe**: If vault unlocks via timer

### 4. Long-Term Resilience
- **Configurable failsafe**: 1-day to 100+ year unlock timers
- **Always depositable**: Can add funds anytime
- **Withdrawal-only lock**: Funds locked until rules complete or failsafe triggers

---

## 👨‍💻 For Developers

### Project Structure
```
├── contracts/                    # Smart contracts
│   ├── VaultProxyFactory.sol     # Proxy factory (EIP-1167)
│   ├── StrategyVaultImplementation.sol  # Upgradable vault logic
│   ├── rules/                    # Rule implementations
│   └── interfaces/               # Contract interfaces
├── frontend/                     # Next.js frontend
│   ├── src/app/                  # App router pages
│   ├── src/components/           # React components
│   └── src/config/               # Configuration & constants
├── scripts/                      # Deployment & utility scripts
├── test/                         # Test suite
└── working-docs/                 # Development documentation
```

### Current Deployment (Avalanche Fuji)
| Contract | Address | Purpose |
|----------|---------|---------|
| **VaultProxyFactory** | `0x0cD47DE2f7d716b0b52c7C0a83Fbc563ee115838` | Deploys proxy vaults |
| **StrategyVaultImplementation** | `0x720FDAa0B171CA358f18D1e71Df7473A55DEb2D1` | Vault logic |
| **TimeLockRule** | `0x181754E8E0603c2C735b14b907B92156DeC9595E` | Time-based rule |
| **PriceRule** | `0xe594075cA42F6832683F38b2FB04aA91aa73AA5F` | Price threshold rule |
| **PerformanceRule** | `0x49E9D7C46C7B990EE1c880A549be2d95DB1e8BFD` | Balance threshold rule |
| **MockERC20 (DANA)** | `0xA729fCc582e0c0150C94e4e68319fF3D0aab3edb` | Test token |

### Running Tests
```bash
# Run all tests
npx hardhat test

# Run specific test file
npx hardhat test test/ProxyVaultSystem.test.ts

# Run with coverage report
npx hardhat coverage
```

### Deploying to Testnet
```bash
# Deploy proxy system to Fuji
npx hardhat run scripts/deploy_proxy_system.ts --network avalancheFuji

# Deploy mock tokens
npx hardhat run scripts/deploy_usdc_t.ts --network avalancheFuji
```

### Architecture Overview
- **VaultProxyFactory**: Creates minimal proxy vaults pointing to StrategyVaultImplementation
- **StrategyVaultImplementation**: Contains all vault logic (rules, fees, state management)
- **Rule System**: Sequential execution of IStrategyRule implementations
- **Registry System** (Phase 2): RuleRegistry, OracleRegistry, DEXRegistry, BridgeRegistry

---

## 📈 Development Roadmap

### Phase 1: Foundation & Proxy Architecture ✅
- [x] EIP-1167 proxy vault system
- [x] Sequential rule engine
- [x] Dual fee mechanism
- [x] Testnet deployment (Avalanche Fuji)
- [x] Frontend integration

### Phase 2: Registry System (In Progress)
- [ ] RuleRegistry for approved rule contracts
- [ ] OracleRegistry for price feeds
- [ ] DEXRegistry for swap routes
- [ ] BridgeRegistry for cross-chain contingency
- [ ] SwapRule and PriceChangeRule implementations

### Phase 3: Governance & Mainnet
- [ ] Multi-sig governance
- [ ] DAO transition
- [ ] Security audits
- [ ] Mainnet deployment

---

## 🤝 Contributing

We welcome contributions! Please see our development documentation in `working-docs/` for:
- Project architecture and design decisions
- Development workflow and standards
- Team roles and coordination protocols

**Key Documentation:**
- `working-docs/planning/development_plan.md` - Detailed development roadmap
- `working-docs/development/documentation-guide.md` - Documentation standards
- `working-docs/development/team-roles.md` - Team coordination

---

**License**: MIT  
**Status**: Phase 1 Complete, Active Development  
**Testnet**: Avalanche Fuji  
**Mainnet**: Coming Soon
