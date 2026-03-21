/**
 * NFT Certificate Smart Contract configuration for Sepolia testnet.
 *
 * INSTRUCTIONS:
 * 1. Deploy contracts/MilestoneCertificateNFT.sol on Sepolia via Remix
 * 2. Constructor args: "MilestoneCertificate", "MSCERT"
 * 3. Paste your deployed contract address below
 */

// Replace with your deployed NFT contract address on Sepolia
// IMPORTANT: This must be a DIFFERENT address from the Escrow contract!
export const NFT_CONTRACT_ADDRESS = "0x7aEd391de5c038A51Bc50733Ba2DBe622dC294F5";

export const NFT_ABI = [
  // mintCertificate(string _milestoneId, string _projectTitle, string _milestoneTitle) returns (uint256)
  {
    inputs: [
      { name: "_milestoneId", type: "string" },
      { name: "_projectTitle", type: "string" },
      { name: "_milestoneTitle", type: "string" },
    ],
    name: "mintCertificate",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  // getCertificate(uint256 tokenId) view
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "getCertificate",
    outputs: [
      { name: "milestoneId", type: "string" },
      { name: "projectTitle", type: "string" },
      { name: "milestoneTitle", type: "string" },
      { name: "completedAt", type: "uint256" },
      { name: "contractor", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
  // isMinted(string _milestoneId) view returns (bool)
  {
    inputs: [{ name: "_milestoneId", type: "string" }],
    name: "isMinted",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  // totalSupply() view returns (uint256)
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  // balanceOf(address) view returns (uint256)
  {
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  // ownerOf(uint256) view returns (address)
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "ownerOf",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "tokenId", type: "uint256" },
      { indexed: true, name: "contractor", type: "address" },
      { indexed: false, name: "milestoneId", type: "string" },
      { indexed: false, name: "projectTitle", type: "string" },
      { indexed: false, name: "milestoneTitle", type: "string" },
    ],
    name: "CertificateMinted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "from", type: "address" },
      { indexed: true, name: "to", type: "address" },
      { indexed: true, name: "tokenId", type: "uint256" },
    ],
    name: "Transfer",
    type: "event",
  },
] as const;

/**
 * Check if NFT contract address is configured.
 */
export function isNFTContractConfigured(): boolean {
  return NFT_CONTRACT_ADDRESS.length > 0 && NFT_CONTRACT_ADDRESS.startsWith("0x");
}
