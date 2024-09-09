import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Zkns } from "../target/types/zkns";
import {
  LightSystemProgram,
  NewAddressParams,
  Rpc,
  bn,
  buildAndSignTx,
  createAccount,
  createRpc,
  defaultStaticAccountsStruct,
  defaultTestStateTreeAccounts,
  deriveAddress,
  packCompressedAccounts,
  packNewAddressParams,
  rpcRequest,
  sendAndConfirmTx,
} from "@lightprotocol/stateless.js";
import dotenv from "dotenv";

dotenv.config();
describe("zkns", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Zkns as Program<Zkns>;

  const {
    accountCompressionAuthority,
    noopProgram,
    registeredProgramPda,
    accountCompressionProgram,
  } = defaultStaticAccountsStruct();

  const rpcUrl = process.env.RPC_URL;
  const connection: Rpc = createRpc(rpcUrl, rpcUrl, rpcUrl, {
    commitment: "confirmed",
  });

  it.skip("Can create compressed account", async () => {
    const seed = Uint8Array.from([127, 69, 28]);
    const txSig = await createAccount(
      connection,
      (provider.wallet as any).payer,
      seed,
      program.programId,
      undefined,
      undefined,
      undefined,
      { skipPreflight: true }
    );

    console.log("Your transaction signature", txSig);
  });
  it("Is initialized!", async () => {
    // const baseDataSeed = anchor.web3.Keypair.generate().publicKey.toBytes();
    // const addressTree = defaultTestStateTreeAccounts().addressTree;
    // const baseDataAddress = await deriveAddress(baseDataSeed, addressTree);

    // const proof = await connection.getValidityProof(undefined, [
    //   bn(baseDataAddress.toBytes()),
    //   bn(assetDataAddress.toBytes()),
    // ]);
    const name = "mjlee.io";
    const { merkleTree, addressQueue } = defaultTestStateTreeAccounts();

    // const addressSeed = deriveAddress(name.toBytes(), merkleTree);

    // Add your test here.
    const tx = await program.methods
      .createRecord("mjlee")
      .accounts({
        signer: provider.wallet.publicKey,
        selfProgram: program.programId,
        lightSystemProgram: LightSystemProgram.programId,
        accountCompressionAuthority,
        noopProgram,
        accountCompressionProgram,
        registeredProgramPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    console.log("Your transaction signature", tx);
  });
});
