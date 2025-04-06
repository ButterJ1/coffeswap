import { ethers } from 'ethers';
import { MiniKit } from '@worldcoin/minikit-js';
import CoffeeSwapAbi from '@/abi/CoffeeSwap.json';
import CoffeeSwapTokenAbi from '@/abi/CoffeeSwapToken.json';

// Tell TypeScript to treat the ABIs as any type to avoid type checking issues
const tokenAbi = CoffeeSwapTokenAbi.abi as any;
const swapAbi = CoffeeSwapAbi.abi as any;

// Contract addresses from environment variables
const tokenContractAddress = process.env.NEXT_PUBLIC_TOKEN_CONTRACT_ADDRESS;
const swapContractAddress = process.env.NEXT_PUBLIC_SWAP_CONTRACT_ADDRESS;
const rpcUrl = process.env.NEXT_PUBLIC_WORLD_CHAIN_RPC_URL || 'https://worldchain-sepolia.g.alchemy.com/public';

// Provider and contracts
let provider: any; // Using any to avoid type conflicts
let tokenContract: ethers.Contract | null = null;
let swapContract: ethers.Contract | null = null;

// Initialize the provider and contracts
export const initContracts = async (): Promise<boolean> => {
  try {
    // For a mini-app environment, we need a JsonRpcProvider
    provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Create contracts with the provider
    tokenContract = new ethers.Contract(
      tokenContractAddress as string,
      tokenAbi,
      provider
    );
    
    swapContract = new ethers.Contract(
      swapContractAddress as string,
      swapAbi,
      provider
    );
    
    return true;
  } catch (error) {
    console.error('Error initializing contracts:', error);
    return false;
  }
};

// Get user balance
export const getUserBalance = async (address: string): Promise<number> => {
  try {
    if (!tokenContract) {
      await initContracts();
    }
    
    if (!tokenContract) return 0;
    
    const balance = await tokenContract.balanceOf(address);
    return parseFloat(ethers.formatUnits(balance, 18));
  } catch (error) {
    console.error('Error getting user balance:', error);
    return 0;
  }
};

// Register user
export const registerUser = async (): Promise<boolean> => {
  try {
    if (!MiniKit.isInstalled()) {
      console.error('MiniKit not installed');
      return false;
    }
    
    const response = await MiniKit.commandsAsync.sendTransaction({
      transaction: [{
        address: swapContractAddress as string,
        abi: swapAbi,
        functionName: 'registerUser',
        args: []
      }]
    });
    
    return response.finalPayload.status === 'success';
  } catch (error) {
    console.error('Error registering user:', error);
    return false;
  }
};

// Create post
export const createPost = async (
  offering: { coffeeType: number; storeType: number },
  accepting: { coffeeType: number; storeType: number }[],
  quantity: number
): Promise<boolean> => {
  try {
    if (!MiniKit.isInstalled()) {
      console.error('MiniKit not installed');
      return false;
    }
    
    // First approve token transfer
    const approveResponse = await MiniKit.commandsAsync.sendTransaction({
      transaction: [{
        address: tokenContractAddress as string,
        abi: tokenAbi,
        functionName: 'approve',
        args: [swapContractAddress, ethers.parseUnits('1', 18).toString()]
      }]
    });
    
    if (approveResponse.finalPayload.status === 'success') {
      // Then create post
      const txResponse = await MiniKit.commandsAsync.sendTransaction({
        transaction: [{
          address: swapContractAddress as string,
          abi: swapAbi,
          functionName: 'createPost',
          args: [offering, accepting, quantity.toString()]
        }]
      });
      
      return txResponse.finalPayload.status === 'success';
    }
    
    return false;
  } catch (error) {
    console.error('Error creating post:', error);
    return false;
  }
};

// Get active posts
export const getActivePosts = async (): Promise<any[]> => {
  try {
    if (!swapContract) {
      await initContracts();
    }
    
    if (!swapContract) {
      console.error('Contract not initialized');
      return [];
    }
    
    const postIds = await swapContract.getActivePostIds();
    const posts = [];
    
    for (let i = 0; i < postIds.length; i++) {
      const id = postIds[i];
      const post = await swapContract.swapPosts(id);
      posts.push({
        id: Number(id),
        user: post.user,
        offering: {
          coffeeType: Number(post.offering.coffeeType),
          storeType: Number(post.offering.storeType)
        },
        quantity: Number(post.quantity),
        timestamp: Number(post.timestamp),
        active: post.active
      });
    }
    
    return posts;
  } catch (error) {
    console.error('Error getting active posts:', error);
    return [];
  }
};

// Find matching posts
export const findMatchingPosts = async (
  coffeeOffered: { coffeeType: number; storeType: number },
  coffeeWanted: { coffeeType: number; storeType: number }
): Promise<any[]> => {
  try {
    if (!swapContract) {
      await initContracts();
    }
    
    if (!swapContract) {
      console.error('Contract not initialized');
      return [];
    }
    
    const postIds = await swapContract.getMatchingPosts(coffeeOffered, coffeeWanted);
    const posts = [];
    
    for (const id of postIds) {
      const post = await swapContract.swapPosts(id);
      posts.push({
        id: Number(id),
        user: post.user,
        offering: {
          coffeeType: Number(post.offering.coffeeType),
          storeType: Number(post.offering.storeType)
        },
        quantity: Number(post.quantity),
        timestamp: Number(post.timestamp),
        active: post.active
      });
    }
    
    return posts;
  } catch (error) {
    console.error('Error finding matching posts:', error);
    return [];
  }
};

// Initiate transaction
export const initiateTransaction = async (postId: number): Promise<boolean> => {
  try {
    if (!MiniKit.isInstalled()) {
      console.error('MiniKit not installed');
      return false;
    }
    
    // First approve token transfer
    const approveResponse = await MiniKit.commandsAsync.sendTransaction({
      transaction: [{
        address: tokenContractAddress as string,
        abi: tokenAbi,
        functionName: 'approve',
        args: [swapContractAddress, ethers.parseUnits('20', 18).toString()]
      }]
    });
    
    if (approveResponse.finalPayload.status === 'success') {
      // Then initiate transaction
      const txResponse = await MiniKit.commandsAsync.sendTransaction({
        transaction: [{
          address: swapContractAddress as string,
          abi: swapAbi,
          functionName: 'initiateTransaction',
          args: [postId.toString()]
        }]
      });
      
      return txResponse.finalPayload.status === 'success';
    }
    
    return false;
  } catch (error) {
    console.error('Error initiating transaction:', error);
    return false;
  }
};

// Accept transaction
export const acceptTransaction = async (transactionId: number): Promise<boolean> => {
  try {
    if (!MiniKit.isInstalled()) {
      console.error('MiniKit not installed');
      return false;
    }
    
    // First approve token transfer
    const approveResponse = await MiniKit.commandsAsync.sendTransaction({
      transaction: [{
        address: tokenContractAddress as string,
        abi: tokenAbi,
        functionName: 'approve',
        args: [swapContractAddress, ethers.parseUnits('20', 18).toString()]
      }]
    });
    
    if (approveResponse.finalPayload.status === 'success') {
      // Then accept transaction
      const txResponse = await MiniKit.commandsAsync.sendTransaction({
        transaction: [{
          address: swapContractAddress as string,
          abi: swapAbi,
          functionName: 'acceptTransaction',
          args: [transactionId.toString()]
        }]
      });
      
      return txResponse.finalPayload.status === 'success';
    }
    
    return false;
  } catch (error) {
    console.error('Error accepting transaction:', error);
    return false;
  }
};

// Confirm transfer
export const confirmTransfer = async (
  transactionId: number,
  phoneLastThreeDigits: number
): Promise<boolean> => {
  try {
    if (!MiniKit.isInstalled()) {
      console.error('MiniKit not installed');
      return false;
    }
    
    const txResponse = await MiniKit.commandsAsync.sendTransaction({
      transaction: [{
        address: swapContractAddress as string,
        abi: swapAbi,
        functionName: 'confirmTransfer',
        args: [transactionId.toString(), phoneLastThreeDigits.toString()]
      }]
    });
    
    return txResponse.finalPayload.status === 'success';
  } catch (error) {
    console.error('Error confirming transfer:', error);
    return false;
  }
};

// Verify transaction (owner only)
export const verifyTransaction = async (
  transactionId: number,
  isValid: boolean
): Promise<boolean> => {
  try {
    if (!MiniKit.isInstalled()) {
      console.error('MiniKit not installed');
      return false;
    }
    
    const txResponse = await MiniKit.commandsAsync.sendTransaction({
      transaction: [{
        address: swapContractAddress as string,
        abi: swapAbi,
        functionName: 'verifyTransaction',
        args: [transactionId.toString(), isValid]
      }]
    });
    
    return txResponse.finalPayload.status === 'success';
  } catch (error) {
    console.error('Error verifying transaction:', error);
    return false;
  }
};

// Get public account phone
export const getPublicAccountPhone = async (): Promise<string> => {
  try {
    if (!swapContract) {
      await initContracts();
    }
    
    if (!swapContract) {
      console.error('Contract not initialized');
      return '';
    }
    
    return await swapContract.getPublicAccountPhone();
  } catch (error) {
    console.error('Error getting public account phone:', error);
    return '';
  }
};

// Buy tokens with paymentz
export const buyTokens = async (amount: number): Promise<boolean> => {
  try {
    if (!MiniKit.isInstalled()) {
      console.error('MiniKit not installed');
      return false;
    }
    
    // Using MiniKit's pay command to purchase tokens
    const { finalPayload } = await MiniKit.commandsAsync.pay({
      reference: `cst-purchase-${Date.now()}`,
      to: tokenContractAddress as string,
      tokens: [
        {
          // @ts-ignore - Ignore the type error for the token symbol
          symbol: 'USDC', 
          token_amount: ethers.parseUnits('1', 6).toString() // 1 USDC (6 decimals)
        }
      ],
      description: `Buy ${amount} CST tokens`
    });
    
    return finalPayload.status === 'success';
  } catch (error) {
    console.error('Error buying tokens:', error);
    return false;
  }
};