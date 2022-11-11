import * as anchor from '@project-serum/anchor';
import * as fs from 'fs';
import { Program, BN } from '@project-serum/anchor';
import { ChainlinkSolanaDemo } from '../target/types/chainlink_solana_demo';
import { createMintToInstruction, getOrCreateAssociatedTokenAccount } from '@solana/spl-token';
import assert from "assert";

const CHAINLINK_PROGRAM_ID = "HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny";
// SOL/USD feed account
const CHAINLINK_FEED = "CcPVS9bqyXbD9cLnTbhhHazLsrua8QMFUHTutPtjyDzq";
const DIVISOR = 100000000;

describe('chainlink-solana-demo', () => {
  const provider = anchor.AnchorProvider.env();
  // Configure the client to use the local cluster.
  anchor.setProvider(provider);

  it('Query SOL/USD Price Feed!', async () => {


    // Generate the program client from the saved workspace
    const program = anchor.workspace.ChainlinkSolanaDemo;

    //create an account to store the price data
    const priceFeedAccount = anchor.web3.Keypair.generate();

    // Execute the RPC.
    let tx = await program.rpc.execute({
      accounts: {
        decimal: priceFeedAccount.publicKey,
        user: provider.wallet.publicKey,
        chainlinkFeed: CHAINLINK_FEED,
        chainlinkProgram: CHAINLINK_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId
      },
      options: { commitment: "confirmed" },
      signers: [priceFeedAccount],
    });

    // Fetch the account details of the account containing the price data
    const latestPrice = await program.account.decimal.fetch(priceFeedAccount.publicKey);
    console.log('Price Is: ' + latestPrice.value / DIVISOR)

    // Ensure the price returned is a positive value
    assert.ok(latestPrice.value / DIVISOR > 0);

  });

  it("mints some usdc", async () => {
    const USDC_MINT = new anchor.web3.PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
    const payer = (provider.wallet as anchor.Wallet).payer;
    assert.ok(payer.publicKey.toBase58() == provider.wallet.publicKey.toBase58())

    //create associated token account
    let usdcTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection, //connection
      payer, //payer
      USDC_MINT, //mint
      payer.publicKey, //owner
    )

    //mint tokens
    const mintTokenTX = new anchor.web3.Transaction();
    mintTokenTX.add(createMintToInstruction(
      USDC_MINT,
      usdcTokenAccount.address,
      payer.publicKey,
      1000 * 10 ** 6, //1000 usdc tokens
    ));
    await provider.sendAndConfirm(mintTokenTX,);

    const newBalance = await provider.connection.getTokenAccountBalance(usdcTokenAccount.address)
    console.log(newBalance);
    assert.equal(Number(newBalance.value.uiAmount), 1000)
  })
});
