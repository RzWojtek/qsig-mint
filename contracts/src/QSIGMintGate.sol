// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

interface IQSIGToken {
    function mint(address to, uint256 amount) external;
}

/// @title QSIGMintGate
/// @notice Bramka mintowania: 1x dziennie per wallet, SPHINCS- proof off-chain,
///         Merkle proof + EIP-712 atestacja on-chain.
contract QSIGMintGate is EIP712 {
    using ECDSA for bytes32;

    uint256 public constant MINT_PRICE      = 0.0005 ether;
    uint256 public constant TOKENS_PER_MINT = 500 * 1e18;
    uint256 public constant MAX_MINTS       = 20_000;

    IQSIGToken public immutable token;
    address    public immutable signer;  // backend ECDSA signer
    address    public immutable dev;     // odbiera ETH z mintów

    uint256 public mintsDone;

    // dayEpoch => Merkle root
    mapping(uint256 => bytes32) public epochRoot;

    // keccak256(wallet, dayEpoch) => czy już mintował
    mapping(bytes32 => bool) public usedSlot;

    event RootPosted(uint256 indexed epoch, bytes32 root);
    event Minted(address indexed recipient, uint256 indexed dayEpoch);

    bytes32 private constant ATTEST_TYPEHASH = keccak256(
        "Attest(address recipient,bytes32 pkHash,uint256 dayEpoch,uint256 chainId)"
    );

    constructor(address _token, address _signer, address _dev)
        EIP712("QSIGMintGate", "1")
    {
        token  = IQSIGToken(_token);
        signer = _signer;
        dev    = _dev;
    }

    /// @notice Backend postuje Merkle root co ~5 min
    function postRoot(uint256 epoch, bytes32 root) external {
        require(msg.sender == signer, "Gate: not signer");
        epochRoot[epoch] = root;
        emit RootPosted(epoch, root);
    }

    /// @notice Główna funkcja mint
    function mint(
        uint256           dayEpoch,
        bytes32           pkHash,
        bytes32[] calldata proof,
        bytes     calldata sig
    ) external payable {
        require(msg.value == MINT_PRICE, "Gate: wrong price");
        require(mintsDone  < MAX_MINTS,  "Gate: sold out");

        // 1. Sprawdź czy wallet dziś mintował
        bytes32 slotKey = keccak256(abi.encodePacked(msg.sender, dayEpoch));
        require(!usedSlot[slotKey], "Gate: already minted today");

        // 2. Sprawdź Merkle proof
        bytes32 root = epochRoot[dayEpoch];
        require(root != bytes32(0), "Gate: no root for epoch");
        bytes32 leaf = keccak256(abi.encodePacked(pkHash, msg.sender));
        require(MerkleProof.verify(proof, root, leaf), "Gate: invalid proof");

        // 3. Sprawdź EIP-712 atestację backendu
        bytes32 structHash = keccak256(abi.encode(
            ATTEST_TYPEHASH, msg.sender, pkHash, dayEpoch, block.chainid
        ));
        require(
            _hashTypedDataV4(structHash).recover(sig) == signer,
            "Gate: bad attestation"
        );

        // 4. Zapisz i mintuj
        usedSlot[slotKey] = true;
        mintsDone++;
        token.mint(msg.sender, TOKENS_PER_MINT);

        // 5. Wyślij ETH do dev
        (bool ok,) = dev.call{value: msg.value}("");
        require(ok, "Gate: ETH failed");

        emit Minted(msg.sender, dayEpoch);
    }

    function currentDayEpoch() external view returns (uint256) {
        return block.timestamp / 86400;
    }

    function hasMinedToday(address wallet) external view returns (bool) {
        uint256 day = block.timestamp / 86400;
        return usedSlot[keccak256(abi.encodePacked(wallet, day))];
    }
}
