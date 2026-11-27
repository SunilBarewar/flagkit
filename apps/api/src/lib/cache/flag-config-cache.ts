import { findFeatureFlagByKey, listFlagVariants, listRulesWithConditions } from "@flagkit/db";
import { ConditionOperator } from "@flagkit/shared/schemas";
import { z } from "zod";

import { createL1, createL2 } from "@/lib/cache/create-stores.ts";
import { cacheInvalidator } from "@/lib/cache/invalidator.ts";
import { TieredCache, cacheEntrySchema } from "@/lib/cache/primitives/tiered-cache.ts";

/**
 * Cache for the flag data the evaluate endpoint needs, one entry per flag, keyed by
 * `<projectId>:<flagKey>`. See docs/flag-config-caching.md.
 *
 * The flag, its rules and its variants are one entry, so they are always read and replaced
 * together. Only what the engine uses is stored (no ids or timestamps), and rules stay in
 * priority order.
 */
const JsonSchema = z.json();
type Json = z.infer<typeof JsonSchema>;

const FlagConfigSchema = z.object({
  flag: z.object({
    key: z.string(),
    enabled: z.boolean(),
    type: z.enum(["boolean", "multivariate"]),
  }),
  rules: z.array(
    z.object({
      enabled: z.boolean(),
      rolloutPercentage: z.number(),
      variantKey: z.string().nullable(),
      conditions: z.array(
        z.object({
          attribute: z.string(),
          operator: ConditionOperator,
          value: JsonSchema,
        }),
      ),
    }),
  ),
  variants: z.array(
    z.object({
      key: z.string(),
      rolloutPercentage: z.number(),
      payload: JsonSchema,
    }),
  ),
});

export type FlagConfig = z.infer<typeof FlagConfigSchema>;

const L1_TTL_MS = 10_000;
const L1_MAX_ENTRIES = 5_000;
const L2_TTL_SECONDS = 5 * 60;
// Short, so a flag that gets created isn't reported missing for long if its invalidation is missed.
const MISSING_L1_TTL_MS = 10_000;
const MISSING_L2_TTL_SECONDS = 30;

const cacheKey = (projectId: string, flagKey: string) => `${projectId}:${flagKey}`;

async function loadFlagConfig(key: string): Promise<FlagConfig | undefined> {
  // A project id is a UUID, so the first `:` always ends it, even if the flag key has one.
  const separator = key.indexOf(":");
  const projectId = key.slice(0, separator);
  const flagKey = key.slice(separator + 1);

  const flag = await findFeatureFlagByKey(projectId, flagKey);
  if (!flag) return undefined;

  const [rules, variants] = await Promise.all([
    listRulesWithConditions(flag.id),
    flag.type === "multivariate" ? listFlagVariants(flag.id) : [],
  ]);

  return {
    flag: { key: flag.key, enabled: flag.enabled, type: flag.type },
    rules: rules.map((rule) => ({
      enabled: rule.enabled,
      rolloutPercentage: rule.rolloutPercentage,
      variantKey: rule.variantKey,
      conditions: rule.conditions.map((condition) => ({
        attribute: condition.attribute,
        operator: condition.operator,
        value: condition.value as Json,
      })),
    })),
    variants: variants.map((variant) => ({
      key: variant.key,
      rolloutPercentage: variant.rolloutPercentage,
      payload: variant.payload as Json,
    })),
  };
}

const flagConfigCache = new TieredCache<FlagConfig>({
  name: "flag",
  invalidator: cacheInvalidator,
  l1: createL1(L1_TTL_MS, L1_MAX_ENTRIES),
  l2: createL2({
    prefix: "flag",
    ttlSeconds: L2_TTL_SECONDS,
    schema: cacheEntrySchema(FlagConfigSchema),
  }),
  missingTtl: { l1Ms: MISSING_L1_TTL_MS, l2Seconds: MISSING_L2_TTL_SECONDS },
  load: loadFlagConfig,
});

/** The flag's config, or undefined if the project has no such flag. */
export function lookupFlagConfig(
  projectId: string,
  flagKey: string,
): Promise<FlagConfig | undefined> {
  return flagConfigCache.get(cacheKey(projectId, flagKey));
}

/**
 * Call after anything that changes what the evaluate endpoint returns for the flag (its
 * switch, rules, variants, creating it or deleting it), once the change is committed.
 */
export function invalidateFlagConfig(projectId: string, flagKey: string): Promise<void> {
  return flagConfigCache.delete(cacheKey(projectId, flagKey));
}
