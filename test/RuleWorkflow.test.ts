import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("Rule Workflow Verification", function () {
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
        // Rule 1: Lock until 1 hour from now
        const unlockTime = (await time.latest()) + 3600;
        timeLockRule = await TimeLockRule.deploy(unlockTime);
    });

    it("Should display correct rule description", async function () {
        const description = await timeLockRule.getDescription();
        console.log(`\n    ✅ Rule Description: "${description}"`);
        expect(description).to.include("TimeLock: Unlocks at timestamp");
    });

    it("Should allow adding a new rule to an existing vault", async function () {
        // 1. Create Vault
        const strategyParams = {
            name: "Rule Test Vault",
            inputAsset: await usdc.getAddress(),
            targetAsset: await usdc.getAddress(),
            executionAmount: ethers.parseUnits("100", 6),
            lockPeriod: 86400,
            beneficiary: user.address,
            router: owner.address,
            hub: owner.address,
            destinationChainSelector: 1,
            linkToken: owner.address,
            rules: [await timeLockRule.getAddress()]
        };

        const tx = await factory.connect(user).createStrategy(strategyParams);
        const receipt = await tx.wait();
        const event = receipt.logs.find((log: any) => log.fragment?.name === "StrategyCreated");
        const strategyAddress = event.args[0];

        const StrategyVault = await ethers.getContractFactory("StrategyVault");
        const strategy = StrategyVault.attach(strategyAddress);

        // 2. Verify Initial Rule
        let rules = await strategy.getRules();
        expect(rules.length).to.equal(1);
        console.log(`    ✅ Initial Rules: ${rules.length}`);

        // 3. Add New Rule (Price Rule)
        // We need to deploy a mock oracle for PriceRule
        const MockV3Aggregator = await ethers.getContractFactory("MockV3Aggregator");
        const mockOracle = await MockV3Aggregator.deploy(8, 200000000000); // $2000

        const PriceRule = await ethers.getContractFactory("PriceRule");
        const priceRule = await PriceRule.deploy(await mockOracle.getAddress(), 300000000000, true); // > $3000

        console.log(`    🚀 Adding new Price Rule...`);
        await (strategy as any).connect(user).addRule(await priceRule.getAddress());

        // 4. Verify New Rule Count and Description
        rules = await strategy.getRules();
        expect(rules.length).to.equal(2);
        console.log(`    ✅ Updated Rules: ${rules.length}`);

        const newRule = PriceRule.attach(rules[1]);
        const newDesc = await newRule.getDescription();
        console.log(`    ✅ New Rule Description: "${newDesc}"`);
        expect(newDesc).to.include("Price: Current > 300000000000");
    });
});
