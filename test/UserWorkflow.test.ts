import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("User Workflow Verification", function () {
    let factory: any;
    let usdc: any;
    let timeLockRule: any;
    let owner: any;
    let user: any;

    before(async function () {
        [owner, user] = await ethers.getSigners();

        // 1. Deploy Contracts
        const StrategyFactory = await ethers.getContractFactory("StrategyFactory");
        factory = await StrategyFactory.deploy();

        const MockERC20 = await ethers.getContractFactory("MockERC20");
        usdc = await MockERC20.deploy("Mock USDC", "USDC", 6);

        const TimeLockRule = await ethers.getContractFactory("TimeLockRule");
        // Rule: Lock until 1 hour from now
        const unlockTime = (await time.latest()) + 3600;
        timeLockRule = await TimeLockRule.deploy(unlockTime);
    });

    it("Should allow user to create a vault with USDC and rules", async function () {
        // User mints some USDC first
        await usdc.mint(user.address, ethers.parseUnits("1000", 6));

        const strategyParams = {
            name: "My USDC Savings",
            inputAsset: await usdc.getAddress(),
            targetAsset: await usdc.getAddress(), // Self-target for simplicity
            executionAmount: ethers.parseUnits("100", 6),
            lockPeriod: 86400, // 1 day
            beneficiary: user.address,
            router: owner.address, // Mock router
            hub: owner.address, // Mock hub
            destinationChainSelector: 1,
            linkToken: owner.address, // Mock link
            rules: [await timeLockRule.getAddress()]
        };

        // Create Strategy
        const tx = await factory.connect(user).createStrategy(strategyParams);
        const receipt = await tx.wait();

        // Get strategy address from event
        const event = receipt.logs.find((log: any) => log.fragment?.name === "StrategyCreated");
        const strategyAddress = event.args[0];

        console.log(`\n    ✅ Vault Created at: ${strategyAddress}`);

        // Verify Vault Details
        const StrategyVault = await ethers.getContractFactory("StrategyVault");
        const strategy = StrategyVault.attach(strategyAddress);

        const params = await strategy.params();
        expect(params.name).to.equal("My USDC Savings");
        expect(params.inputAsset).to.equal(await usdc.getAddress());
        console.log(`    ✅ Vault Name: "${params.name}"`);
        console.log(`    ✅ Input Asset: USDC (${params.inputAsset})`);

        // Verify Rules
        const rules = await strategy.getRules();
        expect(rules.length).to.equal(1);
        console.log(`    ✅ Active Rules: ${rules.length}`);

        // Deposit Funds
        const depositAmount = ethers.parseUnits("50", 6);
        await usdc.connect(user).approve(strategyAddress, depositAmount);
        await strategy.connect(user).deposit(depositAmount);

        const balance = await strategy.getBalance();
        expect(balance).to.equal(depositAmount);
        console.log(`    ✅ Deposited: 50.0 USDC`);
        console.log(`    ✅ Vault Balance: ${ethers.formatUnits(balance, 6)} USDC`);
    });
});
