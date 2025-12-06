import { ethers } from "hardhat";

async function main() {
    console.log("🚀 Deploying Mock Oracle...");

    const [deployer] = await ethers.getSigners();
    console.log(`Deploying with account: ${deployer.address}`);

    // Deploy MockV3Aggregator (8 decimals, Initial price $2000)
    const MockV3Aggregator = await ethers.getContractFactory("MockV3Aggregator");
    const mockOracle = await MockV3Aggregator.deploy(8, 200000000000); // $2000 * 10^8
    await mockOracle.waitForDeployment();

    const address = await mockOracle.getAddress();
    console.log(`✅ Mock Oracle deployed to: ${address}`);

    // Verify current price
    const round = await mockOracle.latestRoundData();
    console.log(`   Current Price: ${round[1]}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
