use anchor_lang::prelude::*;
use light_sdk::{
    compressed_account::LightAccount, light_account, light_accounts, light_program,
    merkle_context::PackedAddressMerkleContext,
};

declare_id!("J4Y18vjQXWtJbo3UNVwyz8MikkGwcqF9sKPhUNBRxZED");

#[light_program]
#[program]
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
#[error_code]
pub enum CustomError {
    #[msg("No authority to perform this action")]
    Unauthorized,
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
#[instruction(name: String)]
pub struct CreateRecord<'info> {
    #[account(mut)]
    #[fee_payer]
    pub signer: Signer<'info>,
    #[self_program]
    pub self_program: Program<'info, crate::program::Zkns>,
    /// CHECK: Checked in light-system-program.
    #[authority]
    // #[account(seeds = [CPI_AUTHORITY_PDA_SEED], bump)]
    pub cpi_signer: AccountInfo<'info>,

    #[light_account(init, seeds = [b"name-service", name.as_bytes()])]
    pub record: LightAccount<NameRecord>,
}
