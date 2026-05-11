// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/QSIGToken.sol";
import "../src/QSIGMintGate.sol";

contract Deploy is Script {
    function run() external {
        address signer      = vm.envAddress("SIGNER_ADDRESS");
        address dev         = vm.envAddress("DEV_ADDRESS");
        address lpRecipient = vm.envAddress("LP_RECIPIENT");
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(deployerKey);

        // Oblicz adres gate zanim zostanie stworzony (CREATE — nonce+1)
        address deployer      = vm.addr(deployerKey);
        address predictedGate = computeCreateAddress(deployer, vm.getNonce(deployer) + 1);

        // Deploy token z adresem gate
        QSIGToken token = new QSIGToken(predictedGate, lpRecipient);

        // Deploy gate
        QSIGMintGate gate = new QSIGMintGate(address(token), signer, dev);

        require(address(gate) == predictedGate, "Deploy: address mismatch!");
        vm.stopBroadcast();

        console.log("========================================");
        console.log("ZAPISZ TE ADRESY DO NOTATNIKA:");
        console.log("QSIGToken:    ", address(token));
        console.log("QSIGMintGate: ", address(gate));
        console.log("Chain ID:     ", block.chainid);
        console.log("========================================");
    }
}
