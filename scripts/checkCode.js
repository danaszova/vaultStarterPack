const { ethers } = require("hardhat");

async function main() {
    const address = "0x98158c809E199208477728644a15994270425985";
    const code = await ethers.provider.getCode(address);
    console.log(`Code at ${address}: ${code.length > 2 ? "EXISTS" : "MISSING"} (${code.length} bytes)`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
