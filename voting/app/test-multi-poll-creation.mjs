import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
const { AnchorProvider, Program, BN } = anchor;
import { readFileSync } from 'fs';
import { randomBytes } from 'crypto';
import { deserializeLE } from '@arcium-hq/client';

// Load IDL
const idl = JSON.parse(readFileSync('./src/idl/voting.json', 'utf8'));

// Configuration
const PROGRAM_ID = new PublicKey('AEspuAAzEw9BNq2Qke45vakpPEcsoT7DhDzP6HHuiemU');
const RPC_URL = 'https://devnet.helius-rpc.com/?api-key=98664a07-fdde-46f8-ac7d-7efd848339c4';

// Load keypair
const keypairPath = process.env.HOME + '/.config/solana/id.json';
const keypairData = JSON.parse(readFileSync(keypairPath, 'utf8'));
const wallet = Keypair.fromSecretKey(new Uint8Array(keypairData));

console.log('Wallet:', wallet.publicKey.toString());

// Setup connection and provider
const connection = new Connection(RPC_URL, 'confirmed');
const provider = new AnchorProvider(connection, {
  publicKey: wallet.publicKey,
  signTransaction: async (tx) => {
    tx.sign([wallet]);
    return tx;
  },
  signAllTransactions: async (txs) => {
    txs.forEach(tx => tx.sign([wallet]));
    return txs;
  }
}, { commitment: 'confirmed' });

const program = new Program(idl, provider);

async function testMultiOptionPoll() {
  try {
    console.log('\n=== Testing Multi-Option Poll Creation ===\n');

    // Generate test data
    const pollId = Date.now() % 1000000;
    const question = "Which feature should we prioritize?";
    const options = ["Mobile App", "Desktop Client", "Web Interface"];
    const nonce = randomBytes(16);
    const nonceValue = new BN(deserializeLE(nonce).toString());
    const computationOffset = new BN(randomBytes(8), 'hex');

    console.log('Poll ID:', pollId);
    console.log('Question:', question);
    console.log('Options:', options);
    console.log('Nonce:', nonceValue.toString());
    console.log('Computation Offset:', computationOffset.toString());

    // Derive PDAs
    const [pollPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('multi_option_poll'), new Uint8Array(new Uint32Array([pollId]).buffer)],
      PROGRAM_ID
    );
    
    const [signPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('sign')],
      PROGRAM_ID
    );

    const [mxeAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from('mxe'), PROGRAM_ID.toBuffer()],
      new PublicKey('BKck65TgoKRokMjQM3datB9oRwJ8rAj2jxPXvHXUvcL6')
    );

    const [mempoolAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from('mempool'), PROGRAM_ID.toBuffer()],
      new PublicKey('BKck65TgoKRokMjQM3datB9oRwJ8rAj2jxPXvHXUvcL6')
    );

    const [executingPool] = PublicKey.findProgramAddressSync(
      [Buffer.from('executing_pool'), PROGRAM_ID.toBuffer()],
      new PublicKey('BKck65TgoKRokMjQM3datB9oRwJ8rAj2jxPXvHXUvcL6')
    );

    const [computationAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from('computation'), PROGRAM_ID.toBuffer(), computationOffset.toArrayLike(Buffer, 'le', 8)],
      new PublicKey('BKck65TgoKRokMjQM3datB9oRwJ8rAj2jxPXvHXUvcL6')
    );

    const compDefOffset = Buffer.from('init_multi_option_vote_stats').reduce((acc, byte, i) => acc + byte * (i + 1), 0) % (2 ** 32);
    const [compDefAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from('comp_def'), PROGRAM_ID.toBuffer(), new Uint8Array(new Uint32Array([compDefOffset]).buffer)],
      new PublicKey('BKck65TgoKRokMjQM3datB9oRwJ8rAj2jxPXvHXUvcL6')
    );

    const [clusterAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from('cluster'), new Uint8Array(new Uint32Array([1078779259]).buffer)],
      new PublicKey('BKck65TgoKRokMjQM3datB9oRwJ8rAj2jxPXvHXUvcL6')
    );

    console.log('\n=== PDAs ===');
    console.log('Poll PDA:', pollPda.toString());
    console.log('Sign PDA:', signPda.toString());
    console.log('MXE Account:', mxeAccount.toString());
    console.log('Comp Def Account:', compDefAccount.toString());
    console.log('Cluster Account:', clusterAccount.toString());

    // Create multi-option poll
    console.log('\n=== Creating Multi-Option Poll ===');
    const tx = await program.methods
      .createMultiOptionPoll(
        computationOffset,
        pollId,
        question,
        options,
        nonceValue
      )
      .accounts({
        payer: wallet.publicKey,
        signPdaAccount: signPda,
        mxeAccount,
        mempoolAccount,
        executingPool,
        computationAccount,
        compDefAccount,
        clusterAccount,
        poolAccount: new PublicKey('7MGSS4iKNM4sVib7bDZDJhVqB6EcchPwVnTKenCY1jt3'),
        clockAccount: new PublicKey('FHriyvoZotYiFnbUzKFjzRSb2NiaC8RPWY7jtKuKhg65'),
        systemProgram: new PublicKey('11111111111111111111111111111111'),
        arciumProgram: new PublicKey('BKck65TgoKRokMjQM3datB9oRwJ8rAj2jxPXvHXUvcL6'),
        pollAcc: pollPda,
      })
      .signers([wallet])
      .rpc({ skipPreflight: false });

    console.log('✅ Transaction successful!');
    console.log('Signature:', tx);
    console.log('\nWaiting for confirmation...');

    await connection.confirmTransaction(tx, 'confirmed');
    console.log('✅ Transaction confirmed!');

    // Fetch poll account
    console.log('\n=== Fetching Poll Account ===');
    const pollAccount = await program.account.multiOptionPollAccount.fetch(pollPda);
    console.log('Poll Account:', JSON.stringify(pollAccount, null, 2));

  } catch (error) {
    console.error('\n❌ Error:', error);
    if (error.logs) {
      console.error('\nProgram Logs:');
      error.logs.forEach(log => console.error(log));
    }
    process.exit(1);
  }
}

testMultiOptionPoll();
