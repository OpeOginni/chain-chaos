# 🎲 **ChainChaos**
*Bet on the heartbeat of Etherlink.*

---

## 🚀 What is ChainChaos?

**ChainChaos** is a fun, weird, and totally unexpected betting game built on **Etherlink**.  
Players place bets on the most unpredictable, quirky metrics of the Etherlink blockchain — like how much gas the chain will burn, how much gas is going to be used on the chain, and even the price of XTZ all randomly selected in 5 minutes intervals.

It's part casino, part chain explorer, part chaos — and 100% fun.  

We believe that every block tells a story — and now you can bet on it.

## 🤖 Automated Betting System

ChainChaos features a **fully automated betting system** that:

- **Creates new bets every 5 minutes** with random categories
- **Fetches real blockchain data** from Etherlink Explorer API
- **Uses anti-manipulation techniques** like random block sampling
- **Provides full transparency** with verfied contract on chain
- **Integrates XTZ price data** from CoinGecko for price betting

### Betting Categories:
- 🔥 **Base Fee Sum**: Total base fee per gas over 5 minutes
- 💸 **Burnt Fees**: Sum from 40-60 randomly sampled blocks  
- ⛽ **Gas Used**: Total gas consumption from random samples
- 💰 **XTZ Price**: Real-time price in USD cents

---

## 🎯 Why we built this

Blockchains aren't just about price charts.  
They're alive, with their own unique rhythm and patterns.  
We wanted to build something that:  

✅ Showcases Etherlink's performance & accessibility.  
✅ Brings fresh liquidity and users into the ecosystem.  
✅ Makes people pay attention to the inner life of the chain.  
✅ Feels bold, original, and just plain fun.  

So we made ChainChaos — the game where the *chain itself is the game.*

---

## 🧩 How it works

1️⃣ Each 5 minutes a betting criteria is choosen from a set of **chaotic metrics**.  
2️⃣ Users place their stake using XTZ or USDC which ever is currently being used for the prediction section & submit their guess.  
3️⃣ When the round ends, the smart contract settles based on live chain data.  
4️⃣ Closest guess wins the pot.  

🎉 Examples of weird-but-fair metrics:
- Total gas burned in the next 5 minutes
- Average block time over the next 10 blocks
- Largest single transaction in the round
- Longest streak of empty blocks
- Last digit of cumulative gas at block N

…and more. Hopefully new chaotic challenges added weekly.

---

## ⚙️ Tech Highlights

- 🧾 **Smart contracts:**  
  - Fully on-chain betting escrow & settlement.  
  - Transparent & auditable.  
  - Deployed on **Etherlink Testnet**

- 🔗 **Chain data oracle (Off Chain):**  
  - Fetches real-time Etherlink chain metrics.  
  - Transparent reporting: anyone can verify the submitted results.  
  - Centralized for MVP, but upgradeable to decentralized oracles.   

- 🖥️ **Frontend:**  
  - User wallet connection powered by **ThirdWeb**.
  - Simple, fun interface for picking bets & watching rounds play out.  
  - Live leaderboard, round history, and player stats.

## ⚙️ Sponsor Tech Tools

- **Etherlink Blockchain**
  - used in the `blockchain/hardhat.config.ts`, where the chains are added for deployment

- **ThirdWeb Wallet**
  - used in the `nextjs-frontned/src/lib/thirdweb.ts`, where we define the etherlink chains so users can connect their wallets to the app.

## Extra Tech Tools

- **Gelato Functions**
  - Ideally the code and cron running on the `automation` folder, expecially `automation/src/index.ts` is to be running on the Gelato functions service, but I was unable to get access to the service before the end of the hack. But running this service on a backend works just as good.

---

## 🌟 The Vision

We see ChainChaos growing into a full-fledged on-chain gaming platform:
- Weekly tournaments
- NFT-based player achievements
- Community-submitted "chaotic metrics"
- Fully decentralized oracle network

But it all starts here — at this hackathon.

---

## 🧪 Try it out!

⚡ Deploying on Etherlink Testnet  
🌐 [Link to demo site]  
📝 Contract address: *to be announced*

---

## 👨‍💻 Team

Built by: **[Opeyemi Oginni](https://github.com/OpeOginni)**  
Hackers, dreamers, and chaos lovers.

---

## 💬 Get in touch

🐦 Twitter: [https://x.com/BrightOginni]  

---

## 🏆 Submission Track

🎨 **Vibecode: Wildest & Most Unexpected**
