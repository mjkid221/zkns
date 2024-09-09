use anchor_lang::prelude::*;
use light_sdk::{
    compressed_account::LightAccount,
    light_account, light_accounts, light_program,
    merkle_context::{PackedAddressMerkleContext, PackedMerkleContext},
};
use light_system_program::invoke::processor::CompressedProof;

declare_id!("J4Y18vjQXWtJbo3UNVwyz8MikkGwcqF9sKPhUNBRxZED");

#[light_program]
pub mod zkns {
    use super::*;

    pub fn create_record<'info>(
        ctx: LightContext<'_, '_, '_, 'info, CreateRecord<'info>>,
        name: String,
    ) -> Result<()> {
        ctx.light_accounts.record.owner = ctx.accounts.signer.key();
        ctx.light_accounts.record.name = name;

        Ok(())
    }
}

#[light_account]
#[derive(Clone, Debug, Default)]
pub struct NameRecord {
    #[truncate]
    pub owner: Pubkey,
    #[truncate]
    pub name: String,
}

#[light_accounts]
pub struct CreateRecord<'info> {
    #[account(mut)]
    #[fee_payer]
    pub signer: Signer<'info>,
    #[self_program]
    pub self_program: Program<'info, crate::program::Zkns>,
    /// CHECK: Checked in light-system-program.
    #[authority]
    pub cpi_signer: AccountInfo<'info>,

    #[light_account(init, seeds = [b"name-service", record.name.as_bytes()])]
    pub record: LightAccount<NameRecord>,
}
