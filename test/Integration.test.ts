import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { MockERC20, StrategyVault } from "../typechain";

describe("Cross-Chain Integration", function () {
    async function deployFixture() {
        const [owner, user] = await ethers.getSigners();

        // 1. Deploy Tokens
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        const usdc = await MockERC20.deploy("USDC", "USDC", 6);
        const link = await MockERC20.deploy("LINK", "LINK", 18);

        // 2. Deploy Mock Router (for Spoke)
        const MockCCIPRouter = await ethers.getContractFactory("MockCCIPRouter");
        const mockRouter = await MockCCIPRouter.deploy();

        // 3. Deploy HODLLock (Destination)
        const HODLLock = await ethers.getContractFactory("HODLLock");
        const hodlLock = await HODLLock.deploy(owner.address);

        // 4. Deploy Hub (Destination) - Router is 'owner' for simulation
        const LegacyVaultHub = await ethers.getContractFactory("LegacyVaultHub");
        const hub = await LegacyVaultHub.deploy(owner.address);
        await hub.setHodlLock(await hodlLock.getAddress());

        // Transfer ownership of HODLLock to Hub (so Hub can call lock)
        await hodlLock.transferOwnership(await hub.getAddress());

        // 5. Deploy Spoke (Source)
        const StrategyFactory = await ethers.getContractFactory("StrategyFactory");
        const factory = await StrategyFactory.deploy();

        const strategyParams = {
            inputAsset: await usdc.getAddress(),
            targetAsset: await usdc.getAddress(),
            oracle: owner.address,
            triggerCondition: (await time.latest()) + 3600,
            executionAmount: ethers.parseUnits("100", 6),
            lockPeriod: 86400, // 1 day
            beneficiary: user.address,
            conditionType: true,
            router: await mockRouter.getAddress(),
            hub: await hub.getAddress(),
            destinationChainSelector: "16015286601757825753",
            linkToken: await link.getAddress()
        };

        await factory.createStrategy(strategyParams);
        const strategyAddress = await factory.getStrategy(0);
        const strategy = await ethers.getContractAt("StrategyVault", strategyAddress);

        // Whitelist Spoke on Hub
        await hub.setSpokeStatus(strategyAddress, true);

        return { owner, user, usdc, link, mockRouter, hodlLock, hub, strategy, strategyParams };
    }

    it("Should execute strategy and lock funds on destination", async function () {
        const { user, usdc, link, mockRouter, hodlLock, hub, strategy, strategyParams } = await deployFixture();

        // --- Source Chain Actions ---

        // Fund Strategy
        await usdc.mint(user.address, ethers.parseUnits("100", 6));
        await (usdc.connect(user) as MockERC20).approve(await strategy.getAddress(), ethers.parseUnits("100", 6));
        await (strategy.connect(user) as StrategyVault).deposit(ethers.parseUnits("100", 6));

        await link.mint(await strategy.getAddress(), ethers.parseUnits("10", 18));

        // Execute Strategy
        await time.increase(3600);
        await expect(strategy.executeStrategy())
            .to.emit(strategy, "StrategyExecuted");

        // Verify Router Event
        const sentEvents = await mockRouter.queryFilter(mockRouter.filters.MessageSent());
        expect(sentEvents.length).to.equal(1);
        const messageId = sentEvents[0].args[1];
        const message = sentEvents[0].args[2];

        // Verify message content
        const decodedData = ethers.AbiCoder.defaultAbiCoder().decode(
            ["address", "uint256"],
            message.data
        );
        expect(decodedData[0]).to.equal(user.address); // Beneficiary
        expect(decodedData[1]).to.equal(BigInt(strategyParams.lockPeriod)); // Lock Period

        // --- Destination Chain Simulation ---

        // Simulate Router transferring tokens to Hub
        const bridgedAmount = ethers.parseUnits("100", 6);
        await usdc.mint(await hub.getAddress(), bridgedAmount);

        // Construct Any2EVMMessage
        const any2EvmMessage = {
            messageId: messageId,
            sourceChainSelector: BigInt(strategyParams.destinationChainSelector), // Assuming same selector for test simplicity
            sender: ethers.zeroPadValue(await strategy.getAddress(), 32),
            data: message.data,
            destTokenAmounts: [
                {
                    token: await usdc.getAddress(),
                    amount: bridgedAmount
                }
            ]
        };

        // Call ccipReceive as Router (owner)
        await expect(hub.ccipReceive(any2EvmMessage))
            .to.emit(hub, "MessageReceived")
            .withArgs(messageId, BigInt(strategyParams.destinationChainSelector), await strategy.getAddress(), user.address, strategyParams.lockPeriod);

        // Verify HODLLock state
        const lockDetails = await hodlLock.getLockDetails(user.address, await usdc.getAddress());
        expect(lockDetails.amount).to.equal(bridgedAmount);
        // Release time should be roughly block.timestamp + lockPeriod
        // We can check if it's in the future
        expect(lockDetails.releaseTime).to.be.gt(await time.latest());
    });
});
