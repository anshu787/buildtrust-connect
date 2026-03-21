// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MilestoneCertificateNFT
 * @notice ERC-721 NFT contract for minting verifiable milestone completion certificates.
 *         Contractors can mint certificates as on-chain proof of completed work.
 *
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Open https://remix.ethereum.org
 * 2. Create a new file and paste this contract
 * 3. In the Solidity Compiler tab, set compiler version to 0.8.20+
 * 4. Compile the contract
 * 5. In Deploy & Run, select "Injected Provider - MetaMask"
 * 6. Make sure MetaMask is on the Sepolia network
 * 7. Deploy with constructor args: "MilestoneCertificate", "MSCERT"
 * 8. Copy the deployed contract address and update src/lib/nftContract.ts
 */

// Minimal ERC-721 implementation (no OpenZeppelin dependency for easy Remix deployment)
contract MilestoneCertificateNFT {
    string public name;
    string public symbol;
    address public owner;
    uint256 private _tokenIdCounter;

    struct Certificate {
        string milestoneId;    // UUID of the milestone
        string projectTitle;
        string milestoneTitle;
        uint256 completedAt;
        address contractor;
    }

    // Token ID => Certificate data
    mapping(uint256 => Certificate) public certificates;
    // Token ID => owner
    mapping(uint256 => address) private _owners;
    // Owner => token count
    mapping(address => uint256) private _balances;
    // Token ID => approved address
    mapping(uint256 => address) private _tokenApprovals;
    // Milestone ID hash => bool (prevent duplicate minting)
    mapping(bytes32 => bool) public milestoneHasCertificate;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event CertificateMinted(
        uint256 indexed tokenId,
        address indexed contractor,
        string milestoneId,
        string projectTitle,
        string milestoneTitle
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Not contract owner");
        _;
    }

    constructor(string memory _name, string memory _symbol) {
        name = _name;
        symbol = _symbol;
        owner = msg.sender;
        _tokenIdCounter = 0;
    }

    // =================== ERC-721 Core ===================

    function balanceOf(address _owner) public view returns (uint256) {
        require(_owner != address(0), "Zero address");
        return _balances[_owner];
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        address tokenOwner = _owners[tokenId];
        require(tokenOwner != address(0), "Token does not exist");
        return tokenOwner;
    }

    function approve(address to, uint256 tokenId) public {
        address tokenOwner = ownerOf(tokenId);
        require(msg.sender == tokenOwner, "Not token owner");
        _tokenApprovals[tokenId] = to;
        emit Approval(tokenOwner, to, tokenId);
    }

    function getApproved(uint256 tokenId) public view returns (address) {
        require(_owners[tokenId] != address(0), "Token does not exist");
        return _tokenApprovals[tokenId];
    }

    function transferFrom(address from, address to, uint256 tokenId) public {
        require(ownerOf(tokenId) == from, "Not owner");
        require(
            msg.sender == from || msg.sender == getApproved(tokenId),
            "Not approved"
        );
        require(to != address(0), "Zero address");

        _tokenApprovals[tokenId] = address(0);
        _balances[from] -= 1;
        _balances[to] += 1;
        _owners[tokenId] = to;

        emit Transfer(from, to, tokenId);
    }

    // =================== Certificate Minting ===================

    /**
     * @notice Mint a milestone completion certificate NFT.
     *         Anyone can mint for themselves (contractor mints their own certificate).
     * @param _milestoneId The UUID string of the completed milestone
     * @param _projectTitle The project name
     * @param _milestoneTitle The milestone name
     */
    function mintCertificate(
        string calldata _milestoneId,
        string calldata _projectTitle,
        string calldata _milestoneTitle
    ) external returns (uint256) {
        bytes32 milestoneHash = keccak256(abi.encodePacked(_milestoneId));
        require(!milestoneHasCertificate[milestoneHash], "Certificate already minted for this milestone");

        _tokenIdCounter += 1;
        uint256 newTokenId = _tokenIdCounter;

        _owners[newTokenId] = msg.sender;
        _balances[msg.sender] += 1;
        milestoneHasCertificate[milestoneHash] = true;

        certificates[newTokenId] = Certificate({
            milestoneId: _milestoneId,
            projectTitle: _projectTitle,
            milestoneTitle: _milestoneTitle,
            completedAt: block.timestamp,
            contractor: msg.sender
        });

        emit Transfer(address(0), msg.sender, newTokenId);
        emit CertificateMinted(newTokenId, msg.sender, _milestoneId, _projectTitle, _milestoneTitle);

        return newTokenId;
    }

    /**
     * @notice Get certificate details by token ID.
     */
    function getCertificate(uint256 tokenId)
        external
        view
        returns (
            string memory milestoneId,
            string memory projectTitle,
            string memory milestoneTitle,
            uint256 completedAt,
            address contractor
        )
    {
        require(_owners[tokenId] != address(0), "Token does not exist");
        Certificate memory cert = certificates[tokenId];
        return (cert.milestoneId, cert.projectTitle, cert.milestoneTitle, cert.completedAt, cert.contractor);
    }

    /**
     * @notice Get total number of certificates minted.
     */
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }

    /**
     * @notice Check if a milestone already has a certificate.
     */
    function isMinted(string calldata _milestoneId) external view returns (bool) {
        return milestoneHasCertificate[keccak256(abi.encodePacked(_milestoneId))];
    }

    /**
     * @notice ERC-165 supportsInterface
     */
    function supportsInterface(bytes4 interfaceId) public pure returns (bool) {
        return interfaceId == 0x80ac58cd || // ERC-721
               interfaceId == 0x01ffc9a7;   // ERC-165
    }
}
