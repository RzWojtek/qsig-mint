// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title QSIG — Quantum Signature Token
/// @notice ERC-20. Tylko MintGate może mintować.
contract QSIGToken is ERC20 {
    address public immutable mintGate;
    uint256 public constant MAX_SUPPLY = 21_000_000 * 1e18;
    address public constant DEAD = 0x000000000000000000000000000000000000dEaD;

    constructor(address _mintGate, address _lpRecipient)
        ERC20("Quantum Signature", "QSIG")
    {
        mintGate = _mintGate;
        _mint(_lpRecipient, 10_000_000 * 1e18); // LP reserve
        _mint(DEAD,          1_000_000 * 1e18); // burn na zawsze
    }

    function mint(address to, uint256 amount) external {
        require(msg.sender == mintGate, "QSIG: only MintGate");
        require(totalSupply() + amount <= MAX_SUPPLY, "QSIG: cap exceeded");
        _mint(to, amount);
    }
}
