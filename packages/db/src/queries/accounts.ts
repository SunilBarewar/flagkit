import { eq } from "drizzle-orm";

import { db } from "../instance.ts";
import { accounts, type Account, type NewAccount } from "../schema/index.ts";

/** `password` must already be hashed, this package never hashes anything. */
export type InsertAccountInput = Pick<NewAccount, "email" | "password">;

/**
 * Insert a new account and return the created row.
 * Throws the Postgres unique violation (23505) if the email is taken.
 */
export async function insertAccount(input: InsertAccountInput): Promise<Account> {
  const [account] = await db.insert(accounts).values(input).returning();
  return account!;
}

export async function findAccountByEmail(email: string): Promise<Account | undefined> {
  const [account] = await db.select().from(accounts).where(eq(accounts.email, email)).limit(1);
  return account;
}

export async function findAccountById(id: string): Promise<Account | undefined> {
  const [account] = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1);
  return account;
}

/** `password` must already be hashed. Only the provided fields are changed. */
export type UpdateAccountInput = Partial<Pick<NewAccount, "email" | "password">>;

/**
 * Update an account and return the new row, or undefined if it doesn't exist.
 * Throws the Postgres unique violation (23505) if the new email is taken.
 */
export async function updateAccount(
  id: string,
  input: UpdateAccountInput,
): Promise<Account | undefined> {
  const [account] = await db.update(accounts).set(input).where(eq(accounts.id, id)).returning();
  return account;
}

/** Returns true if an account was deleted. */
export async function deleteAccount(id: string): Promise<boolean> {
  const deleted = await db
    .delete(accounts)
    .where(eq(accounts.id, id))
    .returning({ id: accounts.id });
  return deleted.length > 0;
}

/** Store the (already hashed) API key. Returns false if the account doesn't exist. */
export async function setAccountApiKeyHash(id: string, apiKeyHash: string): Promise<boolean> {
  const updated = await db
    .update(accounts)
    .set({ apiKeyHash })
    .where(eq(accounts.id, id))
    .returning({ id: accounts.id });
  return updated.length > 0;
}
