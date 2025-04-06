// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CoffeeSwap
 * @dev Contract for securely swapping convenience store coffees between users
 */
contract CoffeeSwap is Ownable, ReentrancyGuard {
    // CST token contract
    IERC20 public cstToken;
    
    // Constants
    uint256 public constant REQUIRED_DEPOSIT = 20 * 10**18; // 20 CST
    uint256 public constant TRANSACTION_FEE = 1 * 10**18;   // 1 CST
    uint256 public constant REWARD_AMOUNT = 5 * 10**17;     // 0.5 CST
    
    // Coffee types enum
    enum CoffeeType {
        LATTE,
        AMERICANO,
        CAPPUCCINO,
        ESPRESSO
    }
    
    // Store types enum
    enum StoreType {
        SEVEN_ELEVEN,
        FAMILY_MART,
        LAWSON
    }
    
    // Coffee details struct
    struct Coffee {
        CoffeeType coffeeType;
        StoreType storeType;
    }
    
    // Swap post struct
    struct SwapPost {
        address user;
        Coffee offering;
        Coffee[] accepting;
        uint256 quantity;
        uint256 timestamp;
        bool active;
    }
    
    // Transaction struct
    struct Transaction {
        address initiator;
        address acceptor;
        Coffee initiatorCoffee;
        Coffee acceptorCoffee;
        uint256 initiatorPhoneLastDigits;
        uint256 acceptorPhoneLastDigits;
        uint256 timestamp;
        TransactionStatus status;
        address firstTransferrer;
    }
    
    // Transaction status enum
    enum TransactionStatus {
        PENDING,
        AWAITING_TRANSFER,
        COMPLETED,
        DISPUTED,
        CANCELLED
    }
    
    // Events
    event PostCreated(address indexed user, uint256 postId);
    event PostUpdated(address indexed user, uint256 postId);
    event PostRemoved(address indexed user, uint256 postId);
    event TransactionInitiated(address indexed initiator, address indexed acceptor, uint256 transactionId);
    event TransferConfirmed(address indexed user, uint256 transactionId);
    event TransactionCompleted(uint256 transactionId);
    event TransactionDisputed(uint256 transactionId);
    event UserRegistered(address indexed user);
    
    // Storage
    SwapPost[] public swapPosts;
    Transaction[] public transactions;
    mapping(address => bool) public registeredUsers;
    mapping(address => uint256) public userDeposits;
    
    // Public account for coffee transfers
    string public publicAccountPhone;
    
    /**
     * @dev Constructor
     * @param _cstToken Address of the CST token contract
     * @param _publicAccountPhone Public phone number for coffee transfers
     */
    constructor(
        address _cstToken,
        string memory _publicAccountPhone
    ) Ownable(msg.sender) {
        cstToken = IERC20(_cstToken);
        publicAccountPhone = _publicAccountPhone;
    }
    
    /**
     * @dev Register a user
     */
    function registerUser() public {
        require(!registeredUsers[msg.sender], "User already registered");
        registeredUsers[msg.sender] = true;
        emit UserRegistered(msg.sender);
    }
    
    /**
     * @dev Create a new swap post
     * @param offering The coffee being offered
     * @param accepting Array of coffees willing to accept
     * @param quantity Quantity of coffee available
     */
    function createPost(
        Coffee memory offering,
        Coffee[] memory accepting,
        uint256 quantity
    ) public {
        require(registeredUsers[msg.sender], "User not registered");
        require(quantity > 0, "Quantity must be greater than zero");
        require(accepting.length > 0, "Must accept at least one type of coffee");
        
        // Charge 1 CST fee for creating a post
        require(cstToken.transferFrom(msg.sender, address(this), TRANSACTION_FEE), "Fee transfer failed");
        
        SwapPost memory newPost = SwapPost({
            user: msg.sender,
            offering: offering,
            accepting: accepting,
            quantity: quantity,
            timestamp: block.timestamp,
            active: true
        });
        
        swapPosts.push(newPost);
        emit PostCreated(msg.sender, swapPosts.length - 1);
    }
    
    /**
     * @dev Initiate a transaction with another user
     * @param postId ID of the post to transact with
     */
    function initiateTransaction(uint256 postId) public nonReentrant {
        require(registeredUsers[msg.sender], "User not registered");
        require(postId < swapPosts.length, "Invalid post ID");
        require(swapPosts[postId].active, "Post is not active");
        require(swapPosts[postId].user != msg.sender, "Cannot trade with yourself");
        
        // Place deposit
        require(cstToken.transferFrom(msg.sender, address(this), REQUIRED_DEPOSIT), "Deposit transfer failed");
        userDeposits[msg.sender] += REQUIRED_DEPOSIT;
        
        // Create transaction
        Transaction memory newTransaction = Transaction({
            initiator: msg.sender,
            acceptor: swapPosts[postId].user,
            initiatorCoffee: findMatchingCoffee(swapPosts, postId, msg.sender),
            acceptorCoffee: swapPosts[postId].offering,
            initiatorPhoneLastDigits: 0,
            acceptorPhoneLastDigits: 0,
            timestamp: block.timestamp,
            status: TransactionStatus.PENDING,
            firstTransferrer: address(0)
        });
        
        transactions.push(newTransaction);
        
        // Request deposit from acceptor
        emit TransactionInitiated(msg.sender, swapPosts[postId].user, transactions.length - 1);
    }
    
    /**
     * @dev Accept a transaction and place deposit
     * @param transactionId ID of the transaction to accept
     */
    function acceptTransaction(uint256 transactionId) public nonReentrant {
        require(transactionId < transactions.length, "Invalid transaction ID");
        require(transactions[transactionId].acceptor == msg.sender, "Not the acceptor");
        require(transactions[transactionId].status == TransactionStatus.PENDING, "Transaction not pending");
        
        // Place deposit
        require(cstToken.transferFrom(msg.sender, address(this), REQUIRED_DEPOSIT), "Deposit transfer failed");
        userDeposits[msg.sender] += REQUIRED_DEPOSIT;
        
        // Update transaction status
        transactions[transactionId].status = TransactionStatus.AWAITING_TRANSFER;
    }
    
    /**
     * @dev Confirm transfer of coffee to public account
     * @param transactionId ID of the transaction
     * @param phoneLastThreeDigits Last three digits of phone number for verification
     */
    function confirmTransfer(uint256 transactionId, uint256 phoneLastThreeDigits) public {
        require(transactionId < transactions.length, "Invalid transaction ID");
        require(
            transactions[transactionId].initiator == msg.sender || 
            transactions[transactionId].acceptor == msg.sender,
            "Not part of this transaction"
        );
        require(transactions[transactionId].status == TransactionStatus.AWAITING_TRANSFER, "Not awaiting transfer");
        require(phoneLastThreeDigits < 1000, "Invalid phone digits");
        
        Transaction storage transaction = transactions[transactionId];
        
        // Record first transferrer for reward
        if (transaction.firstTransferrer == address(0)) {
            transaction.firstTransferrer = msg.sender;
        }
        
        // Update phone digits
        if (transaction.initiator == msg.sender) {
            transaction.initiatorPhoneLastDigits = phoneLastThreeDigits;
        } else {
            transaction.acceptorPhoneLastDigits = phoneLastThreeDigits;
        }
        
        emit TransferConfirmed(msg.sender, transactionId);
    }
    
    /**
     * @dev Verify and complete a transaction (owner only)
     * @param transactionId ID of the transaction to verify
     * @param isValid Whether the transaction is valid
     */
    function verifyTransaction(uint256 transactionId, bool isValid) public onlyOwner {
        require(transactionId < transactions.length, "Invalid transaction ID");
        require(transactions[transactionId].status == TransactionStatus.AWAITING_TRANSFER, "Not awaiting verification");
        require(
            transactions[transactionId].initiatorPhoneLastDigits > 0 && 
            transactions[transactionId].acceptorPhoneLastDigits > 0,
            "Missing confirmation from one party"
        );
        
        Transaction storage transaction = transactions[transactionId];
        
        if (isValid) {
            // Return deposits minus fees
            uint256 initiatorReturn = REQUIRED_DEPOSIT - TRANSACTION_FEE;
            uint256 acceptorReturn = REQUIRED_DEPOSIT - TRANSACTION_FEE;
            
            // Add reward to first transferrer
            if (transaction.firstTransferrer == transaction.initiator) {
                initiatorReturn += REWARD_AMOUNT;
            } else if (transaction.firstTransferrer == transaction.acceptor) {
                acceptorReturn += REWARD_AMOUNT;
            }
            
            // Process refunds and fees
            userDeposits[transaction.initiator] -= REQUIRED_DEPOSIT;
            userDeposits[transaction.acceptor] -= REQUIRED_DEPOSIT;
            
            require(cstToken.transfer(transaction.initiator, initiatorReturn), "Initiator transfer failed");
            require(cstToken.transfer(transaction.acceptor, acceptorReturn), "Acceptor transfer failed");
            
            // Update transaction status
            transaction.status = TransactionStatus.COMPLETED;
            
            emit TransactionCompleted(transactionId);
        } else {
            // Mark as disputed
            transaction.status = TransactionStatus.DISPUTED;
            
            emit TransactionDisputed(transactionId);
        }
    }
    
    /**
     * @dev Helper function to find matching coffee from a user's posts
     * @param posts Array of all swap posts
     * @param currentPostId ID of the post being traded with
     * @param user Address of the user to find matches for
     * @return Coffee that matches the criteria
     */
    function findMatchingCoffee(
        SwapPost[] storage posts,
        uint256 currentPostId,
        address user
    ) private view returns (Coffee memory) {
        SwapPost storage currentPost = posts[currentPostId];
        
        // Find a post by the user that matches what the other user wants
        for (uint256 i = 0; i < posts.length; i++) {
            if (posts[i].user == user && posts[i].active) {
                // Check if this post offers what the other user accepts
                for (uint256 j = 0; j < currentPost.accepting.length; j++) {
                    if (
                        posts[i].offering.coffeeType == currentPost.accepting[j].coffeeType &&
                        posts[i].offering.storeType == currentPost.accepting[j].storeType
                    ) {
                        return posts[i].offering;
                    }
                }
            }
        }
        
        revert("No matching coffee found");
    }
    
    /**
     * @dev Get all active swap posts
     * @return Array of active swap post IDs
     */
    function getActivePostIds() public view returns (uint256[] memory) {
        uint256 activeCount = 0;
        
        // Count active posts
        for (uint256 i = 0; i < swapPosts.length; i++) {
            if (swapPosts[i].active) {
                activeCount++;
            }
        }
        
        // Create array of active post IDs
        uint256[] memory activeIds = new uint256[](activeCount);
        uint256 currentIndex = 0;
        
        for (uint256 i = 0; i < swapPosts.length; i++) {
            if (swapPosts[i].active) {
                activeIds[currentIndex] = i;
                currentIndex++;
            }
        }
        
        return activeIds;
    }
    
    /**
     * @dev Get posts that match a user's criteria
     * @param coffeeOffered Coffee being offered
     * @param coffeeWanted Coffee wanted in return
     * @return Array of matching post IDs
     */
    function getMatchingPosts(
        Coffee memory coffeeOffered,
        Coffee memory coffeeWanted
    ) public view returns (uint256[] memory) {
        uint256 matchCount = 0;
        
        // Count matching posts
        for (uint256 i = 0; i < swapPosts.length; i++) {
            if (
                swapPosts[i].active && 
                swapPosts[i].offering.coffeeType == coffeeWanted.coffeeType &&
                swapPosts[i].offering.storeType == coffeeWanted.storeType
            ) {
                // Check if user accepts what's being offered
                for (uint256 j = 0; j < swapPosts[i].accepting.length; j++) {
                    if (
                        swapPosts[i].accepting[j].coffeeType == coffeeOffered.coffeeType &&
                        swapPosts[i].accepting[j].storeType == coffeeOffered.storeType
                    ) {
                        matchCount++;
                        break;
                    }
                }
            }
        }
        
        // Create array of matching post IDs
        uint256[] memory matchingIds = new uint256[](matchCount);
        uint256 currentIndex = 0;
        
        for (uint256 i = 0; i < swapPosts.length; i++) {
            if (
                swapPosts[i].active && 
                swapPosts[i].offering.coffeeType == coffeeWanted.coffeeType &&
                swapPosts[i].offering.storeType == coffeeWanted.storeType
            ) {
                // Check if user accepts what's being offered
                for (uint256 j = 0; j < swapPosts[i].accepting.length; j++) {
                    if (
                        swapPosts[i].accepting[j].coffeeType == coffeeOffered.coffeeType &&
                        swapPosts[i].accepting[j].storeType == coffeeOffered.storeType
                    ) {
                        matchingIds[currentIndex] = i;
                        currentIndex++;
                        break;
                    }
                }
            }
        }
        
        return matchingIds;
    }
    
    /**
     * @dev Update the public account phone
     * @param _publicAccountPhone New public account phone
     */
    function updatePublicAccountPhone(string memory _publicAccountPhone) public onlyOwner {
        publicAccountPhone = _publicAccountPhone;
    }
    
    /**
     * @dev Get the public account phone
     * @return The public account phone
     */
    function getPublicAccountPhone() public view returns (string memory) {
        return publicAccountPhone;
    }
}