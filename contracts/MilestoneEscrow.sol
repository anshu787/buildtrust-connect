// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MilestoneEscrow
 * @notice A milestone-based escrow contract for construction projects.
 * @dev Deploy on Sepolia testnet via Remix IDE (remix.ethereum.org).
 *
 * How to deploy:
 * 1. Go to https://remix.ethereum.org
 * 2. Create a new file, paste this contract
 * 3. Compile with Solidity 0.8.20+
 * 4. Deploy to Sepolia (select "Injected Provider - MetaMask")
 * 5. Copy the deployed contract address
 * 6. Paste it in src/lib/escrowContract.ts
 */

contract MilestoneEscrow {
    enum MilestoneStatus { Funded, PendingRelease, Released, Disputed }

    struct Milestone {
        bytes32 milestoneId;
        address depositor;
        address payee;
        uint256 amount;
        MilestoneStatus status;
        uint256 createdAt;
        uint256 releasedAt;
    }

    address public owner;
    mapping(bytes32 => Milestone) public milestones;
    bytes32[] public milestoneIds;

    event Deposited(bytes32 indexed milestoneId, address indexed depositor, address indexed payee, uint256 amount);
    event ReleaseRequested(bytes32 indexed milestoneId);
    event Released(bytes32 indexed milestoneId, address indexed payee, uint256 amount);
    event Disputed(bytes32 indexed milestoneId);
    event DisputeResolved(bytes32 indexed milestoneId, address indexed recipient, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyDepositor(bytes32 _milestoneId) {
        require(msg.sender == milestones[_milestoneId].depositor, "Not depositor");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice Deposit ETH into escrow for a milestone
    /// @param _milestoneId Unique identifier for the milestone (use keccak256 of UUID)
    /// @param _payee Address of the contractor who will receive funds
    function deposit(bytes32 _milestoneId, address _payee) external payable {
        require(msg.value > 0, "Must send ETH");
        require(milestones[_milestoneId].amount == 0, "Already funded");
        require(_payee != address(0), "Invalid payee");

        milestones[_milestoneId] = Milestone({
            milestoneId: _milestoneId,
            depositor: msg.sender,
            payee: _payee,
            amount: msg.value,
            status: MilestoneStatus.Funded,
            createdAt: block.timestamp,
            releasedAt: 0
        });

        milestoneIds.push(_milestoneId);
        emit Deposited(_milestoneId, msg.sender, _payee, msg.value);
    }

    /// @notice Request release of funds (called by depositor/builder)
    function requestRelease(bytes32 _milestoneId) external onlyDepositor(_milestoneId) {
        Milestone storage m = milestones[_milestoneId];
        require(m.status == MilestoneStatus.Funded, "Not in funded state");
        m.status = MilestoneStatus.PendingRelease;
        emit ReleaseRequested(_milestoneId);
    }

    /// @notice Confirm release and send funds to payee (called by depositor/builder)
    function releaseFunds(bytes32 _milestoneId) external onlyDepositor(_milestoneId) {
        Milestone storage m = milestones[_milestoneId];
        require(
            m.status == MilestoneStatus.Funded || m.status == MilestoneStatus.PendingRelease,
            "Cannot release"
        );

        uint256 amount = m.amount;
        m.status = MilestoneStatus.Released;
        m.releasedAt = block.timestamp;

        (bool sent, ) = m.payee.call{value: amount}("");
        require(sent, "Transfer failed");

        emit Released(_milestoneId, m.payee, amount);
    }

    /// @notice Raise a dispute on a milestone
    function dispute(bytes32 _milestoneId) external {
        Milestone storage m = milestones[_milestoneId];
        require(
            msg.sender == m.depositor || msg.sender == m.payee,
            "Not a party"
        );
        require(
            m.status == MilestoneStatus.Funded || m.status == MilestoneStatus.PendingRelease,
            "Cannot dispute"
        );
        m.status = MilestoneStatus.Disputed;
        emit Disputed(_milestoneId);
    }

    /// @notice Owner resolves dispute by sending funds to chosen recipient
    function resolveDispute(bytes32 _milestoneId, address _recipient) external onlyOwner {
        Milestone storage m = milestones[_milestoneId];
        require(m.status == MilestoneStatus.Disputed, "Not disputed");
        require(
            _recipient == m.depositor || _recipient == m.payee,
            "Invalid recipient"
        );

        uint256 amount = m.amount;
        m.status = MilestoneStatus.Released;
        m.releasedAt = block.timestamp;

        (bool sent, ) = _recipient.call{value: amount}("");
        require(sent, "Transfer failed");

        emit DisputeResolved(_milestoneId, _recipient, amount);
    }

    /// @notice Get milestone details
    function getMilestone(bytes32 _milestoneId)
        external
        view
        returns (
            address depositor,
            address payee,
            uint256 amount,
            MilestoneStatus status,
            uint256 createdAt,
            uint256 releasedAt
        )
    {
        Milestone storage m = milestones[_milestoneId];
        return (m.depositor, m.payee, m.amount, m.status, m.createdAt, m.releasedAt);
    }

    /// @notice Get total number of milestones
    function getMilestoneCount() external view returns (uint256) {
        return milestoneIds.length;
    }

    /// @notice Get contract balance
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
