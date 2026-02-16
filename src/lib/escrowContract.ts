/**
 * Escrow Smart Contract configuration for Sepolia testnet.
 *
 * INSTRUCTIONS:
 * 1. Deploy contracts/MilestoneEscrow.sol on Sepolia via Remix
 * 2. Paste your deployed contract address below
 */

// Replace with your deployed contract address on Sepolia
export const ESCROW_CONTRACT_ADDRESS = "";

export const SEPOLIA_CHAIN_ID = 11155111;
export const SEPOLIA_CHAIN_ID_HEX = "0xaa36a7";

export const ESCROW_ABI = [
  // deposit(bytes32 _milestoneId, address _payee) payable
  {
    inputs: [
      { name: "_milestoneId", type: "bytes32" },
      { name: "_payee", type: "address" },
    ],
    name: "deposit",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  // requestRelease(bytes32 _milestoneId)
  {
    inputs: [{ name: "_milestoneId", type: "bytes32" }],
    name: "requestRelease",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // releaseFunds(bytes32 _milestoneId)
  {
    inputs: [{ name: "_milestoneId", type: "bytes32" }],
    name: "releaseFunds",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // dispute(bytes32 _milestoneId)
  {
    inputs: [{ name: "_milestoneId", type: "bytes32" }],
    name: "dispute",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // getMilestone(bytes32 _milestoneId) view
  {
    inputs: [{ name: "_milestoneId", type: "bytes32" }],
    name: "getMilestone",
    outputs: [
      { name: "depositor", type: "address" },
      { name: "payee", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "status", type: "uint8" },
      { name: "createdAt", type: "uint256" },
      { name: "releasedAt", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  // getBalance() view
  {
    inputs: [],
    name: "getBalance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  // getMilestoneCount() view
  {
    inputs: [],
    name: "getMilestoneCount",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "milestoneId", type: "bytes32" },
      { indexed: true, name: "depositor", type: "address" },
      { indexed: true, name: "payee", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
    ],
    name: "Deposited",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "milestoneId", type: "bytes32" },
      { indexed: true, name: "payee", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
    ],
    name: "Released",
    type: "event",
  },
] as const;

/**
 * Convert a UUID string to bytes32 for use as milestone ID on-chain.
 */
export function uuidToBytes32(uuid: string): string {
  const hex = uuid.replace(/-/g, "");
  return "0x" + hex.padEnd(64, "0");
}

/**
 * Check if contract address is configured.
 */
export function isContractConfigured(): boolean {
  return ESCROW_CONTRACT_ADDRESS.length > 0 && ESCROW_CONTRACT_ADDRESS.startsWith("0x");
}
