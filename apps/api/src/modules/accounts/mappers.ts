import type { Account } from "@flagkit/db";
import type { AccountResponse } from "@flagkit/shared/schemas";

export function toAccountResponse(account: Account): AccountResponse {
  return {
    id: account.id,
    email: account.email,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };
}
