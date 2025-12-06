const { ethers } = require("ethers");

const addresses = {
    FACTORY_ADDRESS_FUJI: "0x0b9E18564582CD3e491B9FCeED03fF57E8F226B3",
    HUB_ADDRESS_SEPOLIA: "0x3ff7FAAD7417130C60b7422De712eAd9a7C2e3B5",
    ROUTER_FUJI: "0xF694E193200268f9a4868e4Aa017a0118C9a8177",
    LINK_FUJI: "0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846",
    MOCK_TOKEN_FUJI: "0x60501CfceB075600C2446e60B4FfA8A5FA7b7fA0"
};

console.log("Checking addresses...");

for (const [key, address] of Object.entries(addresses)) {
    try {
        const checksummed = ethers.getAddress(address);
        if (checksummed !== address) {
            console.log(`MISMATCH: ${key}`);
            console.log(`  Current: ${address}`);
            console.log(`  Correct: ${checksummed}`);
        } else {
            console.log(`OK: ${key}`);
        }
    } catch (e) {
        console.error(`ERROR: ${key} is invalid: ${e.message}`);
    }
}
