import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api";
import type { CreateFlagInput } from "@/api";
import type {
  EvaluationContext,
  ReplaceRulesInput,
  UpdateFlagBody,
  VariantInput,
} from "@flagkit/shared/schemas";

export const flagsKey = (projectId: string) => ["flags", projectId] as const;

export const flagKey = (projectId: string, flagId: string) => ["flags", projectId, flagId] as const;

// 100 is the API's page limit. Add paging when a project outgrows it.
export const useFlags = (projectId: string) =>
  useQuery({
    queryKey: flagsKey(projectId),
    queryFn: () => apiClient.flags.list(projectId, { limit: 100 }).then((page) => page.data),
  });

export function useToggleFlag(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ flagId, enabled }: { flagId: string; enabled: boolean }) =>
      apiClient.flags.update(projectId, flagId, { enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: flagsKey(projectId) }),
  });
}

export function useCreateFlag(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateFlagInput) => apiClient.flags.create(projectId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: flagsKey(projectId) }),
  });
}

export const useFlag = (projectId: string, flagId: string) =>
  useQuery({
    queryKey: flagKey(projectId, flagId),
    queryFn: () => apiClient.flags.get(projectId, flagId),
  });

interface SaveFlagInput {
  flagId: string;
  body: UpdateFlagBody;
  /** Only for multivariate flags: the flag's complete set of variants. */
  variants?: VariantInput[];
  /** The flag's complete list of rules, when they are being changed. */
  rules?: ReplaceRulesInput["rules"];
}

export function useSaveFlag(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    // Variants and rules first: they are the parts that can be rejected.
    mutationFn: async ({ flagId, body, variants, rules }: SaveFlagInput) => {
      if (variants) await apiClient.flags.replaceVariants(projectId, flagId, variants);
      if (rules) await apiClient.flags.replaceRules(projectId, flagId, rules);
      return apiClient.flags.update(projectId, flagId, body);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: flagsKey(projectId) }),
  });
}

export const useTestFlag = (projectId: string, flagId: string) =>
  useMutation({
    mutationFn: (context: EvaluationContext) =>
      apiClient.flags.evaluate(projectId, flagId, context),
  });
