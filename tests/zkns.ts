import * as anchor from "@coral-xyz/anchor";
import { DecodeType, IdlTypes, Program } from "@coral-xyz/anchor";
import { IDL, Zkns } from "../target/types/zkns";
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
import { sha256 } from "@noble/hashes/sha256";
import { AccountMeta, Keypair, PublicKey } from "@solana/web3.js";
import { IdlType } from "@coral-xyz/anchor/dist/cjs/idl";
dotenv.config();

export type ZknsStruct<
  Name extends string,
  Program = Zkns
> = UnionToIntersection<ArgsType<ProgramInstruction<Name, Program>>>;

type ProgramInstruction<Name extends string, Program> = InstructionTypeByName<
  Program,
  Name
>;

type InstructionTypeByName<Program, Name extends string> = Program extends {
  instructions: Array<infer I>;
}
  ? I extends { name: Name }
    ? I
    : never
  : never;

type ArgsType<Instruction> = Instruction extends { args: infer Args }
  ? Args extends Array<infer Arg>
    ? Arg extends { name: infer Name; type: infer Type extends IdlType }
      ? Name extends string
        ? // Decodes types that work in Typescript
          { [P in Name]: DecodeType<Type, IdlTypes<typeof IDL>> }
        : never
      : never
    : never
  : never;

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;

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
    const name = "mjlee.io";
    const { merkleTree, addressTree, addressQueue, nullifierQueue } =
      defaultTestStateTreeAccounts();
    const initialBuffer = Buffer.concat([
      Buffer.from("name-service"),
      Buffer.from(name),
    ]);

    console.log("initialBuffer: ", new Uint8Array(initialBuffer));
    // const seed = sha256(
    //   Buffer.concat([
    //     program.programId.toBuffer(),
    //     addressTree.toBuffer(),
    //     initialBuffer,
    //   ])
    // );
    const seed = Uint8Array.from([
      0, 91, 103, 81, 192, 160, 189, 147, 94, 95, 58, 91, 113, 221, 201, 135, 3,
      77, 6, 91, 82, 160, 250, 128, 239, 161, 216, 198, 252, 5, 17, 64,
    ]);

    console.log("seed: ", seed);
    const address = await deriveAddress(seed);
    console.log("address----------------: ", address.toBytes());
    console.log("raw address: ", address);

    console.log("addressTreeaddressTree: ", addressTree);
    console.log(
      "inputs ---- : ",
      new Uint8Array(
        Buffer.concat([
          program.programId.toBuffer(),
          addressTree.toBuffer(),
          initialBuffer,
        ])
      )
    );
    const { compressedProof } = await connection.getValidityProof(undefined, [
      bn(address.toBytes()),
    ]);

    const insertOrGet = (
      remainingAccounts: Array<AccountMeta>,
      key: PublicKey
    ): number => {
      const index = remainingAccounts.findIndex((account) =>
        account.pubkey.equals(key)
      );
      if (index === -1) {
        remainingAccounts.push({
          pubkey: key,
          isSigner: false,
          isWritable: true,
        });
        return remainingAccounts.length - 1;
      }
      return index;
    };

    const remainingAccounts: Array<AccountMeta> = [];

    const merkleContext: ZknsStruct<"createRecord">["merkleContext"] = {
      merkleTreePubkeyIndex: insertOrGet(remainingAccounts, merkleTree),
      nullifierQueuePubkeyIndex: insertOrGet(remainingAccounts, nullifierQueue),
      leafIndex: 0,
      queueIndex: undefined,
    };

    const addressMerkleContext: ZknsStruct<"createRecord">["addressMerkleContext"] =
      {
        addressMerkleTreePubkeyIndex: insertOrGet(
          remainingAccounts,
          addressTree
        ),
        addressQueuePubkeyIndex: insertOrGet(remainingAccounts, addressQueue),
      };

    const parameters: ZknsStruct<"createRecord"> = {
      inputs: [],
      proof: compressedProof,
      merkleContext,
      merkleTreeRootIndex: 0,
      addressMerkleContext,
      addressMerkleTreeRootIndex: 0,
      name,
    };

    const tx = await program.methods
      .createRecord(...(Object.values(parameters) as any))
      .accounts({
        signer: provider.wallet.publicKey,
        selfProgram: program.programId,
        lightSystemProgram: LightSystemProgram.programId,
        accountCompressionAuthority,
        noopProgram,
        accountCompressionProgram,
        registeredProgramPda,
        systemProgram: anchor.web3.SystemProgram.programId,
        cpiSigner: PublicKey.findProgramAddressSync(
          [Buffer.from("cpi_authority")],
          program.programId
        )[0],
      })
      .remainingAccounts(remainingAccounts)
      .rpc();
    console.log("Your transaction signature", tx);
  });
});
