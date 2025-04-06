# ☕ CoffeeSwap

CoffeeSwap: Trade convenience store coffees securely on a peer-to-peer blockchain platform.

## Description

CoffeeSwap is a decentralized platform built on World Chain that enables users to trade convenience store coffees with each other. Using smart contracts and a token-based escrow system, users can post coffees they have (like a 7-Eleven Americano) and specify what they're willing to accept in return (such as a Family Mart Latte). The app matches users based on their preferences, facilitates secure transactions through our public account system, and provides verification using phone number digits. Our unique CST token powers the platform, with a 20 CST deposit requirement and bonus rewards for quick transfers. This eliminates coffee waste while creating a fun, community-driven marketplace for coffee enthusiasts.

## How It's Made

CoffeeSwap is built as a World mini app using the MiniKit SDK, allowing us to leverage World App's wallet capabilities and user base. The frontend is developed with Next.js, TypeScript, and Tailwind CSS, creating a mobile-optimized interface that works seamlessly within World App. For the backend, we deployed two Solidity smart contracts on World Chain: the CoffeeSwapToken (CST) contract handles our platform token with custom minting and transaction functions, while the main CoffeeSwap contract manages posts, transaction matching, and verification logic. We implemented a deposit-based escrow system (20 CST) to ensure transaction safety, with a 0.5 CST reward for the first transferrer. The integration between our frontend and smart contracts is handled through a custom contractService layer that uses ethers.js for read operations and MiniKit's transaction capabilities for write operations. One particularly clever implementation is our phone number verification system - users verify coffee transfers by submitting just the last three digits of their phone number, providing a simple yet effective confirmation mechanism that bridges the physical and digital aspects of the exchange.

## Tech Stack

- **Blockchain**: World Chain
- **Smart Contracts**: Solidity
- **Development Framework**: Foundry
- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Blockchain Interaction**: ethers.js
- **World Integration**: World App MiniKit SDK, World App Wallet API

## Features

- **User Authentication**: Secure sign-in with World App wallet
- **Post Creation**: List the coffee you have and specify what you're willing to accept
- **Smart Matching**: Find users who have what you want and want what you have
- **Secure Escrow**: 20 CST deposit to ensure transaction safety
- **Reward System**: 0.5 CST bonus for first transferrer
- **Phone Verification**: Simple last-3-digits verification system
- **Owner Verification**: Special mode for platform owners to verify transfers

## Getting Started

### Prerequisites

- Node.js and npm/pnpm
- Foundry for smart contract development
- A World App account for testing

### Installation

1. Clone the repository:
git clone https://github.com/yourusername/coffeeswap.git
cd coffeeswap

2. Install dependencies:
npm install

3. Set up environment variables:
Create a `.env.local` file with:

        NEXT_PUBLIC_TOKEN_CONTRACT_ADDRESS=0x11eb722F721E9da35a7580a555EE36F9271777C5

        NEXT_PUBLIC_SWAP_CONTRACT_ADDRESS=0x9bD1Ed61B2a692C1204238B37aCdbC70625068a4

        NEXT_PUBLIC_WORLD_CHAIN_RPC_URL=https://worldchain-sepolia.g.alchemy.com/public

4. Run the development server:
npm run dev

### Smart Contract Deployment

1. Navigate to the contracts directory:
cd contracts

2. Compile the contracts:
forge build

3. Deploy to World Chain:
forge script script/Deploy.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast

## Usage Flow

1. **Sign In**: Connect your World App wallet
2. **Create a Post**: Specify what coffee you have and what you're willing to accept
3. **Search**: Find users who have what you want and want what you have
4. **Initiate Trade**: Start a transaction with a 20 CST deposit
5. **Transfer Coffee**: Both users transfer coffee to the public account
6. **Verify**: Confirm transfer with last 3 digits of phone number
7. **Complete**: Owner verifies transfer, deposits are returned, and bonus is awarded

## Smart Contracts

- **CoffeeSwapToken.sol**: ERC-20 token for the platform with custom functions for buying and minting tokens.
- **CoffeeSwap.sol**: Main contract handling posts, transactions, and verification logic.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Contact

For any inquiries, please reach out to [your contact information].
Feel free to customize this README further with any specific details about your project!