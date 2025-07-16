# ChainChaos Frontend

A beautiful and modern frontend for the ChainChaos prediction market platform built on Etherlink with Next.js, Tailwind CSS, and Shadcn UI.

## Features

- 🎮 **Modern UI/UX** - Built with Shadcn UI components and custom Etherlink-themed design
- 🟢 **Custom Green Theme** - Beautiful light green (#38ff9c) color scheme matching Etherlink branding
- 🔗 **Wallet Integration** - Support for MetaMask, Coinbase Wallet, and WalletConnect on Etherlink
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile
- ⚡ **Lightning Fast** - Instant transactions with Etherlink's high performance
- 🏆 **Prize Claims** - Easy prize claiming interface for winners
- 👑 **Owner Dashboard** - Special controls for contract owners to create and manage prediction markets

## Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn
- A Web3 wallet (MetaMask recommended)

### Installation

1. **Install dependencies**
   ```bash
   cd nextjs-frontend
   npm install
   ```

2. **Environment Configuration**
   
   Create a `.env.local` file in the nextjs-frontend directory:
   ```env
   # ChainChaos Contract Addresses
   NEXT_PUBLIC_CHAIN_CHAOS_ADDRESS=0x_your_contract_address_here
   NEXT_PUBLIC_USDC_ADDRESS=0x_your_usdc_address_here
   
   # WalletConnect Project ID (optional)
   NEXT_PUBLIC_WC_PROJECT_ID=your_project_id_here
   ```

3. **Update Contract Address**
   
   Make sure to update the contract addresses in:
   - `src/lib/wagmi.ts` - Update the default addresses
   - Your `.env.local` file with the actual deployed contract addresses

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Architecture

### Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS v4** - Utility-first CSS framework
- **Shadcn UI** - High-quality React components
- **WAGMI** - React hooks for Ethereum
- **Viem** - TypeScript interface for Ethereum
- **Sonner** - Toast notifications

### Key Components

- **WalletConnection** - Handles wallet connection/disconnection
- **BetCard** - Displays individual betting markets
- **CreateBetDialog** - Owner interface for creating new bets
- **HomePage** - Main application interface

### Smart Contract Integration

The frontend interacts with the ChainChaos contract through:

- **Reading Data**: Active bets, settled bets, bet info, user participation status
- **Writing Data**: Placing bets (native ETH or USDC), creating bets (owner only), claiming prizes
- **Event Listening**: Real-time updates when bets are placed or settled

## Usage

### For Players

1. **Connect Wallet** - Use the "Connect Wallet" button in the top right
2. **Browse Bets** - View active and settled betting markets
3. **Place Bets** - Enter your prediction and place bets with XTZ or USDC
4. **Claim Prizes** - Claim winnings from settled bets where you won

### For Contract Owners

1. **Connect Owner Wallet** - Connect the wallet that deployed the contract
2. **Create Bets** - Use the "Create Bet" button to add new betting markets
3. **Manage Bets** - Settle bets with actual values or cancel if needed

## Customization

### Theme Colors

The app uses a custom green theme defined in:
- `tailwind.config.ts` - Tailwind color palette
- `src/app/globals.css` - CSS custom properties
- Custom classes: `.gradient-text`, `.bet-card`, `.glow-primary`

### Adding New Bet Categories

Update the predefined categories in `src/components/CreateBetDialog.tsx`:

```typescript
const predefinedCategories = [
  { value: 'your_category', label: 'Your Category' },
  // ... existing categories
]
```

## Deployment

### Build for Production

```bash
npm run build
npm start
```

### Deploy to Vercel

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

## Smart Contract Requirements

The frontend expects the following contract interface:

- `createBet(category, description, currencyType, betAmount)` - Create new bets
- `placeBetNative(betId, guess)` - Place bets with native currency
- `placeBetUSDC(betId, guess)` - Place bets with USDC
- `settleBet(betId, actualValue)` - Settle bets (owner only)
- `claimPrize(betId)` - Claim prizes
- `getActiveBets()` - Get active bet IDs
- `getSettledBets()` - Get settled bet IDs
- `getBetInfo(betId)` - Get detailed bet information
- `hasPlayerBet(betId, address)` - Check if player has bet

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details
