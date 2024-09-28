use std::borrow::Borrow;
use std::net::{Ipv4Addr, Ipv6Addr};

use anchor_lang::{AnchorDeserialize, InstructionData, ToAccountMetas};
use light_client::indexer::test_indexer::TestIndexer;
use light_client::indexer::{AddressMerkleTreeAccounts, Indexer, StateMerkleTreeAccounts};
use light_client::rpc::merkle_tree::MerkleTreeExt;
use light_client::rpc::test_rpc::ProgramTestRpcConnection;
use light_sdk::address::{derive_address, derive_address_seed};
use light_sdk::compressed_account::CompressedAccountWithMerkleContext;
use light_sdk::error::LightSdkError;
use light_sdk::merkle_context::{
    pack_address_merkle_context, pack_merkle_context, AddressMerkleContext, MerkleContext,
    PackedAddressMerkleContext, PackedMerkleContext, RemainingAccounts,
};
use light_sdk::utils::get_cpi_authority_pda;
use light_sdk::verify::find_cpi_signer;
use light_sdk::{PROGRAM_ID_ACCOUNT_COMPRESSION, PROGRAM_ID_LIGHT_SYSTEM, PROGRAM_ID_NOOP};
use light_test_utils::test_env::{setup_test_programs_with_accounts_v2, EnvAccounts};
use light_test_utils::{RpcConnection, RpcError};
use solana_program_test::{tokio, ProgramTest, ProgramTestContext};
use solana_sdk::account::Account;
use solana_sdk::instruction::{Instruction, InstructionError};
use solana_sdk::native_token::LAMPORTS_PER_SOL;
use solana_sdk::pubkey::Pubkey;
use solana_sdk::signature::{Keypair, Signer};
use solana_sdk::transaction::{Transaction, TransactionError};
use zkns::{CustomError, NameRecord};

#[tokio::test]
async fn test_program() {
    println!("test_program--------------------");
    let (mut rpc, env) =
        setup_test_programs_with_accounts_v2(Some(vec![(String::from("zkns"), zkns::ID)])).await;

    let payer = rpc.get_payer().insecure_clone();

    let mut test_indexer: TestIndexer<ProgramTestRpcConnection> = TestIndexer::new(
        &[StateMerkleTreeAccounts {
            merkle_tree: env.merkle_tree_pubkey,
            nullifier_queue: env.nullifier_queue_pubkey,
            cpi_context: env.cpi_context_account_pubkey,
        }],
        &[AddressMerkleTreeAccounts {
            merkle_tree: env.address_merkle_tree_pubkey,
            queue: env.address_merkle_tree_queue_pubkey,
        }],
        true,
        true,
    )
    .await;

    let name = "mjlee.io";
    let mut remaining_accounts: RemainingAccounts = RemainingAccounts::default();

    let merkle_context = MerkleContext {
        merkle_tree_pubkey: env.merkle_tree_pubkey,
        nullifier_queue_pubkey: env.nullifier_queue_pubkey,
        leaf_index: 0,
        queue_index: None,
    };

    let merkle_context = pack_merkle_context(merkle_context, &mut remaining_accounts);

    println!("merkle_context: {:?}", merkle_context);

    let address_merkle_context = AddressMerkleContext {
        address_merkle_tree_pubkey: env.address_merkle_tree_pubkey,
        address_queue_pubkey: env.address_merkle_tree_queue_pubkey,
    };

    let address_seed = derive_address_seed(
        &[b"name-service", name.as_bytes()],
        &zkns::ID,
        &address_merkle_context,
    );

    let test = &[b"name-service", name.as_bytes()];
    println!("test: {:?}", test);

    println!("program_id: {:?}", zkns::ID.to_bytes().as_slice());
    println!(
        "address_merkle_tree_pubkey: {:?}",
        address_merkle_context.address_merkle_tree_pubkey
    );
    println!("address_seed: {:?}", address_seed);
    let address = derive_address(&address_seed, &address_merkle_context);

    println!("address: {:?}", address);

    // turn address into PublicKey
    let address_pubkey = Pubkey::try_from(address);
    println!("address_pubkey: {:?}", address_pubkey);
}

pub struct SetUpTest {
    pub validator: ProgramTest,
    pub user: Keypair,
    pub counter_pda: Pubkey,
}

/// Returns the validator, an optional funded user account, and the counter PDA
impl SetUpTest {
    pub fn new() -> Self {
        //Both of these work

        // let mut validator = ProgramTest::default();
        // validator.add_program("anchor_counter", anchor_counter::ID, None);
        let mut validator = ProgramTest::new("zkns", zkns::ID, None);

        //create a new user and fund with 1 SOL
        //add the user to the validator / ledger
        let user = Keypair::new();
        validator.add_account(
            user.try_pubkey().unwrap(),
            Account {
                lamports: 1_000_000_000,
                ..Account::default()
            },
        );

        //get the counter PDA -- uses the same seed we used in the anchor program
        let (counter_pda, _) = Pubkey::find_program_address(&[b"counter"], &zkns::ID);

        Self {
            validator,
            user,
            counter_pda,
        }
    }
}
