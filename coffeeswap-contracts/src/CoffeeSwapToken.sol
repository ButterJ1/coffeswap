// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
/**
 * @title CoffeeSwapToken
 * @dev ERC20 token for the CoffeeSwap platform
 */
contract CoffeeSwapToken is ERC20, Ownable {
    // Events
    event TokensBought(address indexed buyer, uint256 amount);

    // Token price in Wei (5 NTD = ~$0.16)
    uint256 public tokenPrice = 0.00016 ether;

    /**
     * @dev Constructor
     * @param initialSupply Initial token supply to mint to owner
     */
    constructor(uint256 initialSupply) ERC20("CoffeeSwap Token", "CST") Ownable(msg.sender) {
        _mint(msg.sender, initialSupply * 10**decimals());
    }

    /**
     * @dev Allow users to buy tokens by sending ETH
     */
    function buyTokens() public payable {
        require(msg.value > 0, "Must send ETH to buy tokens");

        // Calculate token amount based on ETH sent
        uint256 tokenAmount = (msg.value * 10**decimals()) / tokenPrice;

        // Transfer tokens to buyer
        _mint(msg.sender, tokenAmount);

        emit TokensBought(msg.sender, tokenAmount);
    }

    /**
     * @dev Withdraw ETH from contract (owner only)
     * @param to Address to send ETH to
     * @param amount Amount of ETH to withdraw
     */
    function withdrawEth(address payable to, uint256 amount) public onlyOwner {
        require(address(this).balance >= amount, "Insufficient balance");
        to.transfer(amount);
    }

    /**
     * @dev Update token price (owner only)
     * @param newPrice New token price in Wei
     */
    function updateTokenPrice(uint256 newPrice) public onlyOwner {
        require(newPrice > 0, "Price must be greater than zero");
        tokenPrice = newPrice;
    }

    /**
     * @dev Mint additional tokens (owner only)
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount * 10**decimals());
    }
}