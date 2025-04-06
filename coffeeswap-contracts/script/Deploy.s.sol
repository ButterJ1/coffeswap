// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/CoffeeSwapToken.sol";
import "../src/CoffeeSwap.sol";

contract DeployScript is Script {
    function run() external {
        // Load private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Start the deployment
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy token first
        uint256 initialSupply = 1000000; // 1 million CST
        CoffeeSwapToken token = new CoffeeSwapToken(initialSupply);
        
        // Deploy CoffeeSwap contract
        string memory publicAccount = "0900-277-151";
        CoffeeSwap coffeeSwap = new CoffeeSwap(address(token), publicAccount);
        
        // Transfer some tokens to the CoffeeSwap contract for rewards
        token.transfer(address(coffeeSwap), 10000 * 10**18); // 10,000 CST
        
        vm.stopBroadcast();
        
        // Log deployment addresses
        console.log("CoffeeSwapToken deployed at:", address(token));
        console.log("CoffeeSwap deployed at:", address(coffeeSwap));
    }
}