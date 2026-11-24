import type { FeatureFlag } from "@flagkit/db";
import type { EvaluateFlagResponse, EvaluationContext } from "@flagkit/shared/schemas";
import { createHash } from "node:crypto";

/**
 * Evaluates a boolean flag for one user. Pure: no I/O, so it is trivial to test.
 *
 * A disabled flag is off for everyone. An enabled flag is on for the users the rollout
 * reaches: 100 means everyone, 0 means nobody, anything between is a stable slice of users.
 * Targeting rules and variants will layer on top of this later.
 */
export function evaluateFlag(
  flag: Pick<FeatureFlag, "key" | "enabled" | "rolloutPercentage">,
  context: EvaluationContext,
): EvaluateFlagResponse {
  const enabled = flag.enabled && getBucket(context.userId, flag.key) < flag.rolloutPercentage;

  return { key: flag.key, enabled };
}

/**
 * A stable bucket from 0 to 99 for this user and flag: the same inputs always give the same
 * bucket, so a user keeps their result, and raising the rollout only ever adds users.
 * The flag key is part of the hash so one flag's rollout doesn't pick the same users as another's.
 */
export function getBucket(userId: string, flagKey: string): number {
  const digest = createHash("sha256").update(`${flagKey}:${userId}`).digest();

  return digest.readUInt32BE(0) % 100;
}
