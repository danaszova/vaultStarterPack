const { getAddress } = require("ethers");

const address = "0x816F5E2D93988469929C235f68D845Fb6735787b";
try {
    // Lowercase first to bypass checksum check, then get the correct checksum
    const checksummed = getAddress(address.toLowerCase());
    console.log("Original:", address);
    console.log("Checksum:", checksummed);
} catch (error) {
    console.error("Error:", error.message);
}
