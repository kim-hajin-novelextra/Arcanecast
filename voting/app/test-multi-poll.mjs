import * as anchor from '@coral-xyz/anchor';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { readFileSync } from 'fs';
import os from 'os';

const idl = JSON.parse(readFileSync('./src/idl/voting.json', 'utf-8'));

const PROGRAM_ID = new PublicKey('AEspuAAzEw9BNq2Qke45vakpPEcsoT7DhDzP6HHuiemU');
const RPC_URL = 'https://devnet.helius-rpc.com/?api-key=98664a07-fdde-46f8-ac7d-7efd848339c4';

async function testMultiOptionPoll() {
  try {
    // Load wallet
    const walletPath = `${os.homedir()}/.config/solana/id.json`;
    const walletKeypair = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(readFileSync(walletPath, 'utf-8')))
    );

    // Setup connection and provider
    const connection = new Connection(RPC_URL, 'confirmed');
    const wallet = new anchor.Wallet(walletKeypair);
    const provider = new anchor.AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
    });
    anchor.setProvider(provider);

    // Create program instance
    const program = new anchor.Program(idl, PROGRAM_ID, provider);

    console.log('🧪 Testing multi-option poll creation...');
    console.log('Wallet:', walletKeypair.publicKey.toString());
    console.log('Program:', PROGRAM_ID.toString());

    // Test poll data
    const pollId = Math.floor(Date.now() / 1000);
    const question = 'Test Multi-Option Poll';
    const options = ['Option A', 'Option B', 'Option C'];

    console.log('\n📝 Poll Details:');
    console.log('  ID:', pollId);
    console.log('  Question:', question);
    console.log('  Options:', options);

    // Generate nonce
    const nonce = new anchor.BN(Math.floor(Math.random() * 1000000000000));
    const computationOffset = new anchor.BN(Math.floor(Math.random() * 1000000000));

    console.log('\n🔢 Parameters:');
    console.log('  Nonce:', nonce.toString());
    console.log('  Computation Offset:', computationOffset.toString());

    // Derive PDAs
    const [pollPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('poll'), new anchor.BN(pollId).toArrayLike(Buffer, 'le', 4)],
      PROGRAM_ID
    );

    const [signPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('signer')],
      PROGRAM_ID
    );

    console.log('\n📍 PDAs:');
    console.log('  Poll:', pollPda.toString());
    console.log('  Signer:', signPda.toString());

    // Create poll
    console.log('\n🚀 Creating multi-option poll on-chain...');
    
    const tx = await program.methods
      .createMultiOptionPoll(
        computationOffset,
        pollId,
        question,
        options,
        nonce
      )
      .accounts({
        payer: walletKeypair.publicKey,
      })
      .rpc();

    console.log('\n✅ Transaction successful!');
    console.log('Signature:', tx);
    console.log('\n🎉 Multi-option poll creation is WORKING!');
    console.log('The "not enough arguments" error has been FIXED!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.logs) {
      console.error('\n📋 Transaction Logs:');
      error.logs.forEach(log => console.error('  ', log));
    }
    process.exit(1);
  }
}

testMultiOptionPoll();
