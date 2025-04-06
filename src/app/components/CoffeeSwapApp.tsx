'use client';

import React, { useState, useEffect } from 'react';
import { MiniKit } from '@worldcoin/minikit-js';
import { Coffee, SwapPost, CoffeeTransaction } from '../../types';
import * as contractService from '../../services/contractService';

// Coffee and store types
const COFFEE_TYPES = [
  { id: 0, name: 'Latte' },
  { id: 1, name: 'Americano' },
  { id: 2, name: 'Cappuccino' },
  { id: 3, name: 'Espresso' }
];

const STORE_TYPES = [
  { id: 0, name: '7-Eleven' },
  { id: 1, name: 'Family Mart' },
  { id: 2, name: 'Hi-Life' },
  { id: 3, name: 'OK mart' }
];

// Public account for coffee transfers
const PUBLIC_ACCOUNT = "0900-277-151";

// Helper functions
const getCoffeeTypeName = (id: number): string => COFFEE_TYPES.find(type => type.id === id)?.name || 'Unknown';
const getStoreTypeName = (id: number): string => STORE_TYPES.find(type => type.id === id)?.name || 'Unknown';
const formatAddress = (address: string): string => {
  if (!address) return '';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};
const getStatusText = (status: number): string => {
  const statusMap: Record<number, string> = {
    0: 'Pending',
    1: 'Awaiting Transfer',
    2: 'Completed',
    3: 'Disputed',
    4: 'Cancelled'
  };
  return statusMap[status] || 'Unknown';
};

// Helper function to launch convenience store app
const launchConvenienceStoreApp = () => {
  alert('Launching convenience store app...');
  // In a real implementation, this would use something like:
  // window.location.href = 'convenience-store-app://transfer';
};

const CoffeeSwapApp: React.FC = () => {
  const [tab, setTab] = useState<string>('home');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [userAddress, setUserAddress] = useState<string>('');
  const [userBalance, setUserBalance] = useState<number>(0);
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [offeringCoffee, setOfferingCoffee] = useState<Coffee>({ coffeeType: 0, storeType: 0 });
  const [acceptingCoffees, setAcceptingCoffees] = useState<Coffee[]>([{ coffeeType: 1, storeType: 0 }]);
  const [quantity, setQuantity] = useState<number>(1);
  const [wantedCoffee, setWantedCoffee] = useState<Coffee>({ coffeeType: 1, storeType: 0 });
  const [tradingCoffee, setTradingCoffee] = useState<Coffee>({ coffeeType: 0, storeType: 0 });
  const [posts, setPosts] = useState<SwapPost[]>([]);
  const [transactions, setTransactions] = useState<CoffeeTransaction[]>([]);
  const [phoneDigits, setPhoneDigits] = useState<string>('');
  const [currentPost, setCurrentPost] = useState<SwapPost | null>(null);
  const [currentTransaction, setCurrentTransaction] = useState<CoffeeTransaction | null>(null);
  const [filteredPosts, setFilteredPosts] = useState<SwapPost[]>([]);
  const [pendingVerifications, setPendingVerifications] = useState<CoffeeTransaction[]>([]);
  const [showVerification, setShowVerification] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<'success' | 'failure' | null>(null);
  const [hasNotifications, setHasNotifications] = useState<boolean>(false);
  const [showLaunchAppModal, setShowLaunchAppModal] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Initialize MiniKit and load user data
  useEffect(() => {
    if (MiniKit.isInstalled()) {
      // Initialize contracts
      contractService.initContracts().then(() => {
        console.log("Contracts initialized successfully");
      }).catch(error => {
        console.error("Failed to initialize contracts:", error);
      });

      // Handle wallet auth for login
      const checkLogin = async () => {
        if (MiniKit.walletAddress) {
          setIsLoggedIn(true);
          setUserAddress(MiniKit.walletAddress);

          // Check if user is the contract owner
          if (MiniKit.walletAddress.toLowerCase() === '0x093bc5fff05e5351c3c04ae68bd14f3401922f93'.toLowerCase()) {
            setIsOwner(true);
          }

          // Get user balance from contract
          try {
            const balance = await contractService.getUserBalance(MiniKit.walletAddress);
            setUserBalance(balance);
          } catch (error) {
            console.error("Error fetching user balance:", error);
          }

          // Load posts and transactions
          loadPosts();
          loadTransactions();
        }
      };

      checkLogin();
    }
  }, []);

  // Load posts from contract
  const loadPosts = async () => {
    try {
      const activePosts = await contractService.getActivePosts();
      setPosts(activePosts);
    } catch (error) {
      console.error("Error loading posts:", error);
    }
  };

  // Load transactions from contract
  const loadTransactions = async () => {
    // In a real implementation, you would fetch the user's transactions from the contract
    // For now, we'll just use an empty array
    setTransactions([]);
  };

  // Login with Wallet Auth
  const handleLogin = async () => {
    if (!MiniKit.isInstalled()) {
      // For development, you can simulate a successful login
      if (process.env.NODE_ENV === 'development') {
        console.log('DEV MODE: Simulating successful login');
        setIsLoggedIn(true);
        setUserAddress('0x093bc5fff05e5351c3c04ae68bd14f3401922f93'); // Your address
        setIsOwner(true);
        setUserBalance(100); // Mock balance
        return;
      }
      
      alert('Please open this app in World App');
      return;
    }

    try {
      setIsLoading(true);
      // Fetch nonce from backend
      const nonceRes = await fetch('/api/nonce');
      const { nonce } = await nonceRes.json();

      // Request wallet authentication
      const { finalPayload } = await MiniKit.commandsAsync.walletAuth({
        nonce: nonce,
        statement: 'Sign in to CoffeeSwap',
        expirationTime: new Date(new Date().getTime() + 1 * 24 * 60 * 60 * 1000)
      });

      if (finalPayload.status === 'success') {
        // Verify in backend
        const verifyRes = await fetch('/api/verify-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payload: finalPayload, nonce })
        });

        if (verifyRes.ok) {
          setIsLoggedIn(true);
          setUserAddress(finalPayload.address);

          // Check if user is the contract owner
          if (finalPayload.address.toLowerCase() === '0x093bc5fff05e5351c3c04ae68bd14f3401922f93'.toLowerCase()) {
            setIsOwner(true);
          }

          // Register user in contract
          await contractService.registerUser();

          // Get user balance from contract
          const balance = await contractService.getUserBalance(finalPayload.address);
          setUserBalance(balance);

          // Load posts and transactions
          loadPosts();
          loadTransactions();
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle owner mode
  const toggleOwnerMode = () => {
    if (isOwner) {
      setShowVerification(!showVerification);
    }
  };

  // Create a new post
  const handleCreatePost = () => {
    if (userBalance < 1) {
      alert('You need at least 1 CST to create a post (transaction fee)');
      return;
    }

    // In a real app, this would call the smart contract
    const newPost: SwapPost = {
      id: posts.length + 1,
      user: userAddress,
      offering: offeringCoffee,
      accepting: acceptingCoffees,
      quantity
    };

    setPosts([...posts, newPost]);
    alert('Post created successfully! It will be visible to other users looking for your coffee type.');
    setTab('home');
  };

  // Search for matching posts
  const handleSearch = () => {
    // In a real app, this would call the smart contract to find matching posts
    // For demo, we'll simulate filtering based on the search criteria

    // Create some sample posts for the demo
    const samplePosts: SwapPost[] = [
      {
        id: 1,
        user: '0xB9876543210fedcba',
        offering: { coffeeType: wantedCoffee.coffeeType, storeType: wantedCoffee.storeType },
        accepting: [tradingCoffee],
        quantity: 2
      },
      {
        id: 2,
        user: '0xC1234567890abcdef',
        offering: { coffeeType: wantedCoffee.coffeeType, storeType: wantedCoffee.storeType },
        accepting: [tradingCoffee, { coffeeType: 2, storeType: 0 }],
        quantity: 1
      }
    ];

    setFilteredPosts(samplePosts);
  };

  // Initiate a transaction
  const handleInitiateTransaction = (post: SwapPost) => {
    if (userBalance < 21) {
      alert('You need at least 21 CST to initiate a transaction (20 CST deposit + 1 CST fee)');
      return;
    }

    // In a real app, this would call the smart contract
    const newTransaction: CoffeeTransaction = {
      id: transactions.length + 1,
      initiator: userAddress,
      acceptor: post.user,
      initiatorCoffee: tradingCoffee,
      acceptorCoffee: post.offering,
      status: 0, // PENDING
      timestamp: Date.now()
    };

    setTransactions([...transactions, newTransaction]);
    alert('Transaction initiated! Please wait for the other user to accept. They will be notified.');
    setTab('transactions');
  };

  // Accept a transaction
  const handleAcceptTransaction = (transaction: CoffeeTransaction) => {
    if (userBalance < 21) {
      alert('You need at least 21 CST to accept a transaction (20 CST deposit + 1 CST fee)');
      return;
    }

    // In a real app, this would call the smart contract
    const updatedTransactions = transactions.map(t => {
      if (t.id === transaction.id) {
        return { ...t, status: 1 }; // AWAITING_TRANSFER
      }
      return t;
    });

    setTransactions(updatedTransactions);
    alert(`Transaction accepted! Please transfer your coffee to the public account (${PUBLIC_ACCOUNT}). The first user to transfer will receive a 0.5 CST bonus when the transaction completes.`);
  };

  // Confirm transfer
  const handleConfirmTransfer = (transaction: CoffeeTransaction) => {
    if (phoneDigits.length !== 3 || isNaN(Number(phoneDigits))) {
      alert('Please enter the last 3 digits of your phone number');
      return;
    }

    // In a real app, this would call the smart contract
    setCurrentTransaction(null);
    alert(`Transfer confirmed! Please wait for verification. Your 20 CST deposit will be returned (minus 1 CST fee) once the transaction is complete.`);

    // Add bonus explanation based on timing
    const isFirstTransferrer = true; // In a real app, this would be determined by the contract
    if (isFirstTransferrer) {
      alert('You are the first to transfer! You will receive a 0.5 CST bonus when the transaction completes.');
    }

    // In a real app, the owner would get a notification to verify
    if (isOwner) {
      setPendingVerifications([...pendingVerifications, transaction]);
      setHasNotifications(true);
    }
  };

  // Launch convenience store app
  const handleLaunchApp = () => {
    // Check if user has enough balance first
    if (userBalance < 21) {
      alert('You need at least 21 CST (20 CST deposit + 1 CST fee) to proceed');
      return;
    }

    setShowLaunchAppModal(false);
    launchConvenienceStoreApp();
  };

  // Verify transaction (owner only)
  const handleVerifyTransaction = (transaction: CoffeeTransaction, isValid: boolean) => {
    if (!isOwner) return;

    // In a real app, this would call the smart contract
    if (isValid) {
      // Update transaction status
      const updatedTransactions = transactions.map(t => {
        if (t.id === transaction.id) {
          return { ...t, status: 2 }; // COMPLETED
        }
        return t;
      });

      setTransactions(updatedTransactions);
      setVerificationResult('success');

      // Remove from pending verifications
      setPendingVerifications(pendingVerifications.filter(t => t.id !== transaction.id));

      setTimeout(() => {
        setVerificationResult(null);
      }, 3000);

      alert('Transaction verified successfully! Deposit returned to users (minus fees) and bonus awarded to first transferrer.');
    } else {
      // Mark as disputed
      const updatedTransactions = transactions.map(t => {
        if (t.id === transaction.id) {
          return { ...t, status: 3 }; // DISPUTED
        }
        return t;
      });

      setTransactions(updatedTransactions);
      setVerificationResult('failure');

      // Remove from pending verifications
      setPendingVerifications(pendingVerifications.filter(t => t.id !== transaction.id));

      setTimeout(() => {
        setVerificationResult(null);
      }, 3000);

      alert('Transaction marked as disputed. Deposit will be held until resolved.');
    }
  };

  // Add more accepting coffees
  const handleAddAcceptingCoffee = () => {
    setAcceptingCoffees([...acceptingCoffees, { coffeeType: 0, storeType: 0 }]);
  };

  // Update accepting coffee at specific index
const handleAcceptingCoffeeChange = (index: number, field: keyof Coffee, value: string) => {
  const updated = [...acceptingCoffees];
  updated[index] = { ...updated[index], [field]: parseInt(value) };
  setAcceptingCoffees(updated);
};

  // Buy CST tokens
  const handleBuyTokens = async () => {
    if (!MiniKit.isInstalled()) {
      alert('Please open this app in World App');
      return;
    }

    try {
      setIsLoading(true);
      // Call contract to buy tokens
      const success = await contractService.buyTokens(20);

      if (success) {
        // Update user balance
        if (userAddress) {
          const balance = await contractService.getUserBalance(userAddress);
          setUserBalance(balance);
        }
        alert('Successfully purchased 20 CST tokens!');
      } else {
        alert('Failed to purchase tokens. Please try again.');
      }
    } catch (error) {
      console.error('Token purchase error:', error);
      alert('Failed to purchase tokens. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 max-w-md mx-auto">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg flex items-center space-x-3">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-blue-600">Loading...</span>
          </div>
        </div>
      )}
      {/* Header */}
      <header className="bg-blue-600 text-white p-3 shadow-md">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-xl font-bold">☕ CoffeeSwap</h1>
            {isOwner && (
              <button
                onClick={toggleOwnerMode}
                className={`ml-2 px-2 py-1 rounded-md text-xs ${showVerification ? 'bg-yellow-500' : 'bg-green-500'}`}
              >
                {showVerification ? 'User Mode' : 'Owner Mode'}
              </button>
            )}
          </div>
          {isLoggedIn ? (
            <div className="flex items-center space-x-2">
              <span className="text-sm">{formatAddress(userAddress)}</span>
              <span className="bg-blue-700 px-2 py-1 rounded-full text-xs">
                {userBalance} CST
              </span>
              <button
                onClick={() => setTab('buy-tokens')}
                className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded-md text-xs transition"
              >
                Buy
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              className="bg-white text-blue-600 px-3 py-1 rounded-md hover:bg-blue-50 transition text-sm"
              disabled={isLoading}
            >
              Connect Wallet
            </button>
          )}
        </div>
      </header>

      {/* Navigation */}
      {isLoggedIn && !showVerification && (
        <nav className="bg-white shadow-sm">
          <div className="flex justify-between">
            <button
              onClick={() => setTab('home')}
              className={`flex-1 px-2 py-2 text-xs font-medium transition ${tab === 'home' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Home
            </button>
            <button
              onClick={() => setTab('create-post')}
              className={`flex-1 px-2 py-2 text-xs font-medium transition ${tab === 'create-post' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Create Post
            </button>
            <button
              onClick={() => setTab('search')}
              className={`flex-1 px-2 py-2 text-xs font-medium transition ${tab === 'search' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Find Swap
            </button>
            <button
              onClick={() => setTab('transactions')}
              className={`flex-1 px-2 py-2 text-xs font-medium transition relative ${tab === 'transactions' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Transactions
              {hasNotifications && !isOwner && (
                <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
              )}
            </button>
          </div>
        </nav>
      )}

      {/* Owner Verification Mode */}
      {isLoggedIn && isOwner && showVerification && (
        <div className="p-4 bg-yellow-50 border-b border-yellow-200">
          <h2 className="text-lg font-semibold text-yellow-800 mb-2">Owner Verification Mode</h2>
          <p className="text-sm text-yellow-700 mb-4">
            Verify coffee transfers by checking the convenience store app and confirming phone number digits.
          </p>

          {pendingVerifications.length > 0 ? (
            <div className="space-y-4">
              {pendingVerifications.map(transaction => (
                <div key={transaction.id} className="bg-white p-3 rounded-lg shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">Transaction #{transaction.id}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(transaction.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="text-sm space-y-1 mb-3">
                    <p><span className="text-gray-600">From:</span> {formatAddress(transaction.initiator)}</p>
                    <p><span className="text-gray-600">To:</span> {formatAddress(transaction.acceptor)}</p>
                    <p><span className="text-gray-600">Trading:</span> {getStoreTypeName(transaction.initiatorCoffee.storeType)} {getCoffeeTypeName(transaction.initiatorCoffee.coffeeType)}</p>
                    <p><span className="text-gray-600">For:</span> {getStoreTypeName(transaction.acceptorCoffee.storeType)} {getCoffeeTypeName(transaction.acceptorCoffee.coffeeType)}</p>
                    <p><span className="text-gray-600">Phone Digits:</span> ***-***-{transaction.initiatorPhoneLastDigits || '???'} / ***-***-{transaction.acceptorPhoneLastDigits || '???'}</p>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => launchConvenienceStoreApp()}
                      className="flex-1 bg-blue-100 text-blue-700 px-3 py-2 rounded-md text-sm"
                    >
                      Check App
                    </button>
                    <button
                      onClick={() => handleVerifyTransaction(transaction, true)}
                      className="flex-1 bg-green-500 text-white px-3 py-2 rounded-md text-sm"
                    >
                      Verify
                    </button>
                    <button
                      onClick={() => handleVerifyTransaction(transaction, false)}
                      className="flex-1 bg-red-500 text-white px-3 py-2 rounded-md text-sm"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500">No pending verifications</p>
          )}

          {verificationResult && (
            <div className={`fixed bottom-4 left-0 right-0 mx-auto w-80 p-3 rounded-lg shadow-lg text-center text-white ${verificationResult === 'success' ? 'bg-green-500' : 'bg-red-500'
              }`}>
              {verificationResult === 'success'
                ? 'Transaction verified successfully!'
                : 'Transaction rejected!'}
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      <main className="p-4 flex-grow">
        {!isLoggedIn ? (
          <div className="flex flex-col items-center justify-center h-full space-y-6">
            <div className="text-center space-y-3">
              <h2 className="text-2xl font-bold text-gray-800">Welcome to CoffeeSwap</h2>
              <p className="text-gray-600 text-sm">
                Trade your convenience store coffees with others in a secure, peer-to-peer way.
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4 w-full">
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <span className="text-blue-600 text-sm">1</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">Connect Wallet</h3>
                    <p className="text-xs text-gray-500">Secure, private authentication</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <span className="text-blue-600 text-sm">2</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">List or find coffee swaps</h3>
                    <p className="text-xs text-gray-500">Post what you have and what you want</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <span className="text-blue-600 text-sm">3</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">Complete the swap</h3>
                    <p className="text-xs text-gray-500">Securely transfer through our platform</p>
                  </div>
                </div>
                <button
                  onClick={handleLogin}
                  className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition mt-3 text-sm"
                >
                  Connect Wallet
                </button>
              </div>
            </div>
          </div>
        ) : tab === 'home' && !showVerification ? (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-md p-4">
              <h2 className="text-lg font-semibold mb-3">Recent Swap Posts</h2>
              {posts.length > 0 ? (
                <div className="space-y-3">
                  {posts.map(post => (
                    <div key={post.id} className="border rounded-md p-3 hover:border-blue-400 transition">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs text-gray-500">Posted by: {formatAddress(post.user)}</p>
                          <h3 className="font-medium text-sm mt-1">
                            Offering: {post.quantity}x {getStoreTypeName(post.offering.storeType)} {getCoffeeTypeName(post.offering.coffeeType)}
                          </h3>
                          <p className="text-xs mt-1">
                            Accepting: {post.accepting.map((coffee, i) => (
                              <span key={i}>
                                {i > 0 && ', '}
                                {getStoreTypeName(coffee.storeType)} {getCoffeeTypeName(coffee.coffeeType)}
                              </span>
                            ))}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setTradingCoffee(post.accepting[0]);
                            setCurrentPost(post);
                            setTab('search');
                          }}
                          className="bg-blue-100 text-blue-600 px-2 py-1 rounded-md hover:bg-blue-200 transition text-xs"
                        >
                          Trade
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6">
                  <p className="text-gray-500 text-sm mb-3">No posts available yet</p>
                  <button
                    onClick={() => setTab('create-post')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm"
                  >
                    Create Your First Post
                  </button>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-md p-4">
              <h2 className="text-lg font-semibold mb-3">How It Works</h2>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-100 p-1 rounded-full mt-0.5">
                    <span className="text-blue-600 text-xs">1</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">Create a post</h3>
                    <p className="text-xs text-gray-600">Specify what coffee you have and what you're willing to accept</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-100 p-1 rounded-full mt-0.5">
                    <span className="text-blue-600 text-xs">2</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">Match with others</h3>
                    <p className="text-xs text-gray-600">Find users who have what you want and want what you have</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-100 p-1 rounded-full mt-0.5">
                    <span className="text-blue-600 text-xs">3</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">Secure transaction</h3>
                    <p className="text-xs text-gray-600">Both users place a 20 CST deposit, then transfer coffee to our public account ({PUBLIC_ACCOUNT})</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-100 p-1 rounded-full mt-0.5">
                    <span className="text-blue-600 text-xs">4</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">Verification</h3>
                    <p className="text-xs text-gray-600">Verify transfers with the last 3 digits of your phone number</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-100 p-1 rounded-full mt-0.5">
                    <span className="text-blue-600 text-xs">5</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">Get rewarded</h3>
                    <p className="text-xs text-gray-600">First user to transfer gets a bonus of 0.5 CST</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : tab === 'create-post' && !showVerification ? (
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-semibold mb-3">Create Swap Post</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  I'm offering:
                </label>
                <div className="flex space-x-2">
                  <select
                    value={offeringCoffee.storeType}
                    onChange={(e) => setOfferingCoffee({ ...offeringCoffee, storeType: parseInt(e.target.value) })}
                    className="flex-1 border rounded-md px-2 py-1 text-sm"
                  >
                    {STORE_TYPES.map(store => (
                      <option key={store.id} value={store.id}>{store.name}</option>
                    ))}
                  </select>
                  <select
                    value={offeringCoffee.coffeeType}
                    onChange={(e) => setOfferingCoffee({ ...offeringCoffee, coffeeType: parseInt(e.target.value) })}
                    className="flex-1 border rounded-md px-2 py-1 text-sm"
                  >
                    {COFFEE_TYPES.map(coffee => (
                      <option key={coffee.id} value={coffee.id}>{coffee.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity available:
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value))}
                  className="w-full border rounded-md px-2 py-1 text-sm"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    I'm willing to accept:
                  </label>
                  <button
                    onClick={handleAddAcceptingCoffee}
                    className="text-blue-600 text-xs hover:text-blue-800"
                  >
                    + Add option
                  </button>
                </div>
                {acceptingCoffees.map((coffee, index) => (
                  <div key={index} className="flex space-x-2 mt-2">
                    <select
                      value={coffee.storeType}
                      onChange={(e) => handleAcceptingCoffeeChange(index, 'storeType', e.target.value)}
                      className="flex-1 border rounded-md px-2 py-1 text-sm"
                    >
                      {STORE_TYPES.map(store => (
                        <option key={store.id} value={store.id}>{store.name}</option>
                      ))}
                    </select>
                    <select
                      value={coffee.coffeeType}
                      onChange={(e) => handleAcceptingCoffeeChange(index, 'coffeeType', e.target.value)}
                      className="flex-1 border rounded-md px-2 py-1 text-sm"
                    >
                      {COFFEE_TYPES.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  onClick={() => setTab('home')}
                  className="px-3 py-1 border rounded-md hover:bg-gray-100 transition text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreatePost}
                  className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition text-sm"
                >
                  Create Post
                </button>
              </div>
            </div>
          </div>
        ) : tab === 'search' && !showVerification ? (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-md p-4">
              <h2 className="text-lg font-semibold mb-3">Find a Coffee Swap</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    I'm looking for:
                  </label>
                  <div className="flex space-x-2">
                    <select
                      value={wantedCoffee.storeType}
                      onChange={(e) => setWantedCoffee({ ...wantedCoffee, storeType: parseInt(e.target.value) })}
                      className="flex-1 border rounded-md px-2 py-1 text-sm"
                    >
                      {STORE_TYPES.map(store => (
                        <option key={store.id} value={store.id}>{store.name}</option>
                      ))}
                    </select>
                    <select
                      value={wantedCoffee.coffeeType}
                      onChange={(e) => setWantedCoffee({ ...wantedCoffee, coffeeType: parseInt(e.target.value) })}
                      className="flex-1 border rounded-md px-2 py-1 text-sm"
                    >
                      {COFFEE_TYPES.map(coffee => (
                        <option key={coffee.id} value={coffee.id}>{coffee.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    I'm trading my:
                  </label>
                  <div className="flex space-x-2">
                    <select
                      value={tradingCoffee.storeType}
                      onChange={(e) => setTradingCoffee({ ...tradingCoffee, storeType: parseInt(e.target.value) })}
                      className="flex-1 border rounded-md px-2 py-1 text-sm"
                    >
                      {STORE_TYPES.map(store => (
                        <option key={store.id} value={store.id}>{store.name}</option>
                      ))}
                    </select>
                    <select
                      value={tradingCoffee.coffeeType}
                      onChange={(e) => setTradingCoffee({ ...tradingCoffee, coffeeType: parseInt(e.target.value) })}
                      className="flex-1 border rounded-md px-2 py-1 text-sm"
                    >
                      {COFFEE_TYPES.map(coffee => (
                        <option key={coffee.id} value={coffee.id}>{coffee.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleSearch}
                    className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition text-sm"
                  >
                    Search
                  </button>
                </div>
              </div>
            </div>

            {filteredPosts.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-4">
                <h2 className="text-lg font-semibold mb-3">Match Results</h2>
                <div className="space-y-3">
                  {filteredPosts.map(post => (
                    <div key={post.id} className="border rounded-md p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs text-gray-500">Posted by: {formatAddress(post.user)}</p>
                          <h3 className="font-medium text-sm mt-1">
                            Offering: {post.quantity}x {getStoreTypeName(post.offering.storeType)} {getCoffeeTypeName(post.offering.coffeeType)}
                          </h3>
                          <p className="text-xs mt-1">
                            Accepting: {post.accepting.map((coffee, i) => (
                              <span key={i}>
                                {i > 0 && ', '}
                                {getStoreTypeName(coffee.storeType)} {getCoffeeTypeName(coffee.coffeeType)}
                              </span>
                            ))}
                          </p>
                        </div>
                        <button
                          onClick={() => handleInitiateTransaction(post)}
                          className="bg-green-500 text-white px-2 py-1 rounded-md hover:bg-green-600 transition text-xs"
                        >
                          Swap Now
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-3 bg-blue-50 rounded-md">
                  <p className="text-xs text-blue-800">
                    <strong>Note:</strong> Initiating a swap requires a 20 CST deposit to ensure trust.
                    This will be returned (minus a 1 CST fee) after the transaction is complete.
                  </p>
                </div>
              </div>
            )}

            {filteredPosts.length === 0 && tab === 'search' && (
              <div className="bg-white rounded-lg shadow-md p-4 text-center">
                <p className="text-gray-500 text-sm mb-3">No matching posts found. Try different criteria or create a new post.</p>
                <button
                  onClick={() => setTab('create-post')}
                  className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition text-sm"
                >
                  Create a Post
                </button>
              </div>
            )}
          </div>
        ) : tab === 'transactions' && !showVerification ? (
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-semibold mb-3">My Transactions</h2>
            {transactions.length > 0 ? (
              <div className="space-y-3">
                {transactions.map(transaction => (
                  <div key={transaction.id} className="border rounded-md p-3">
                    <div className="flex justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${transaction.status === 2 ? 'bg-green-100 text-green-800' :
                              transaction.status === 3 ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                            }`}>
                            {getStatusText(transaction.status)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(transaction.timestamp).toLocaleTimeString()}
                          </span>
                        </div>

                        <div className="mt-2 space-y-1 text-xs">
                          <p className="flex">
                            <span className="w-20 text-gray-600">You send:</span>
                            <span className="font-medium">
                              {getStoreTypeName(transaction.initiatorCoffee.storeType)} {getCoffeeTypeName(transaction.initiatorCoffee.coffeeType)}
                            </span>
                          </p>
                          <p className="flex">
                            <span className="w-20 text-gray-600">You receive:</span>
                            <span className="font-medium">
                              {getStoreTypeName(transaction.acceptorCoffee.storeType)} {getCoffeeTypeName(transaction.acceptorCoffee.coffeeType)}
                            </span>
                          </p>
                          <p className="flex">
                            <span className="w-20 text-gray-600">With user:</span>
                            <span className="font-medium">
                              {transaction.initiator === userAddress ? formatAddress(transaction.acceptor) : formatAddress(transaction.initiator)}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col justify-center">
                        {transaction.status === 0 && transaction.acceptor === userAddress && (
                          <button
                            onClick={() => handleAcceptTransaction(transaction)}
                            className="bg-blue-600 text-white px-2 py-1 rounded-md hover:bg-blue-700 transition text-xs"
                          >
                            Accept
                          </button>
                        )}

                        {transaction.status === 1 && (
                          <button
                            onClick={() => {
                              setShowLaunchAppModal(true);
                              setCurrentTransaction(transaction);
                            }}
                            className="bg-green-500 text-white px-2 py-1 rounded-md hover:bg-green-600 transition text-xs"
                          >
                            Transfer
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 text-sm py-6">No transactions yet.</p>
            )}
          </div>
        ) : tab === 'buy-tokens' && !showVerification ? (
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-semibold mb-3">Buy CST Tokens</h2>
            <div className="space-y-4">
              <div className="bg-blue-50 p-3 rounded-md">
                <h3 className="font-medium text-blue-800 text-sm mb-2">Why you need CST Tokens</h3>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• 20 CST required as deposit for each transaction</li>
                  <li>• 1 CST fee per completed transaction</li>
                  <li>• 0.5 CST reward for being first to transfer</li>
                  <li>• 1 CST to create a swap post</li>
                </ul>
              </div>

              <div className="border rounded-md p-3">
                <h3 className="font-medium text-sm mb-2">Token Package</h3>
                <p className="text-sm text-gray-700 mb-1">20 CST Tokens</p>
                <p className="text-xs text-gray-500 mb-3">Price: 1 WLD (~5 NTD)</p>
                <button
                  onClick={handleBuyTokens}
                  className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition text-sm"
                >
                  Buy Now
                </button>
              </div>

              <div className="text-xs text-gray-500">
                <p>CST tokens are used only within the CoffeeSwap platform and have no value outside of it.</p>
              </div>
            </div>
          </div>
        ) : null}
      </main>

      {/* Launch Convenience Store App Modal */}
      {showLaunchAppModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-10">
          <div className="bg-white rounded-lg p-4 max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-3">Transfer Coffee</h3>
            <div className="bg-blue-50 p-3 rounded-md mb-4">
              <p className="text-sm text-blue-800 font-medium mb-1">Transfer Instructions:</p>
              <ol className="text-xs text-blue-700 space-y-1 list-decimal pl-4">
                <li>Launch the convenience store app</li>
                <li>Transfer your coffee to public account: <span className="font-bold">{PUBLIC_ACCOUNT}</span></li>
                <li>Return here and confirm with your phone digits</li>
              </ol>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              The first user to transfer will receive a 0.5 CST bonus when the transaction completes!
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowLaunchAppModal(false)}
                className="px-3 py-1 border rounded-md hover:bg-gray-100 transition text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleLaunchApp}
                className="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 transition text-sm"
              >
                Launch App
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Transfer Modal */}
      {currentTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-10">
          <div className="bg-white rounded-lg p-4 max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-3">Confirm Coffee Transfer</h3>
            <p className="text-sm mb-3">
              Please confirm that you have transferred your coffee to our public account:
            </p>
            <div className="bg-gray-100 p-2 rounded-md text-center mb-4">
              <p className="font-mono text-lg">{PUBLIC_ACCOUNT}</p>
            </div>

            <p className="text-sm mb-3">
              Enter the last 3 digits of your phone number for verification:
            </p>

            <input
              type="text"
              maxLength={3}
              placeholder="Last 3 digits"
              value={phoneDigits}
              onChange={(e) => setPhoneDigits(e.target.value.replace(/[^0-9]/g, ''))}
              className="w-full border rounded-md px-3 py-2 mb-4 text-center text-lg font-mono"
            />

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setCurrentTransaction(null)}
                className="px-3 py-1 border rounded-md hover:bg-gray-100 transition text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmTransfer(currentTransaction)}
                className="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 transition text-sm"
              >
                Confirm Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-3 mt-auto">
        <div className="text-center text-xs">
          <p>© 2025 CoffeeSwap - Powered by World Chain</p>
        </div>
      </footer>
    </div>
  );
};

export default CoffeeSwapApp;