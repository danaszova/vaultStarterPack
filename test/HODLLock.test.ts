import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";


describe("HODLLock", function () {
    async function deployFixture() {
        const [owner, user] = await ethers.getSigners();

        const MockERC20 = await ethers.getContractFactory("MockERC20");
        const token = await MockERC20.deploy("Test Token", "TEST", 18);

        const HODLLock = await ethers.getContractFactory("HODLLock");
        const hodlLock = await HODLLock.deploy(owner.address);

        return { hodlLock, token, owner, user };
    }

    describe("Locking", function () {
        it("Should lock tokens correctly", async function () {
            const { hodlLock, token, owner, user } = await deployFixture();
            const amount = ethers.parseUnits("100", 18);
            const duration = 3600;

            // Mint and approve
            await token.mint(owner.address, amount);
            await token.approve(await hodlLock.getAddress(), amount);

            const tx = await hodlLock.lock(user.address, await token.getAddress(), amount, duration);
            const receipt = await tx.wait();
            const block = await ethers.provider.getBlock(receipt!.blockNumber);
            const expectedReleaseTime = block!.timestamp + duration;

            await expect(tx)
                .to.emit(hodlLock, "Locked")
                .withArgs(user.address, await token.getAddress(), amount, expectedReleaseTime);

            const lockDetails = await hodlLock.getLockDetails(user.address, await token.getAddress());
            expect(lockDetails.amount).to.equal(amount);
            expect(lockDetails.releaseTime).to.equal(expectedReleaseTime);
        });

        it("Should fail if not owner", async function () {
            const { hodlLock, token, user } = await deployFixture();
            const amount = ethers.parseUnits("100", 18);

            await expect(hodlLock.connect(user).lock(user.address, await token.getAddress(), amount, 3600))
                .to.be.revertedWithCustomError(hodlLock, "OwnableUnauthorizedAccount");
        });
    });

    describe("Withdrawing", function () {
        it("Should withdraw after lock period", async function () {
            const { hodlLock, token, owner, user } = await deployFixture();
            const amount = ethers.parseUnits("100", 18);
            const duration = 3600;

            await token.mint(owner.address, amount);
            await token.approve(await hodlLock.getAddress(), amount);
            await hodlLock.lock(user.address, await token.getAddress(), amount, duration);

            // Fast forward
            await time.increase(duration + 1);

            await expect(hodlLock.connect(user).withdraw(await token.getAddress()))
                .to.emit(hodlLock, "Withdrawn")
                .withArgs(user.address, await token.getAddress(), amount);

            expect(await token.balanceOf(user.address)).to.equal(amount);
        });

        it("Should revert withdrawal before lock period", async function () {
            const { hodlLock, token, owner, user } = await deployFixture();
            const amount = ethers.parseUnits("100", 18);
            const duration = 3600;

            await token.mint(owner.address, amount);
            await token.approve(await hodlLock.getAddress(), amount);
            await hodlLock.lock(user.address, await token.getAddress(), amount, duration);

            await expect(hodlLock.connect(user).withdraw(await token.getAddress()))
                .to.be.revertedWith("Funds are still locked");
        });
    });
});
