import type {
  CreateFlagInput,
  EvaluationContext,
  FlagResponse,
  PaginationQuery,
  ReplaceRulesInput,
  TestFlagResponse,
  RuleResponse,
  UpdateFlagBody,
  VariantInput,
  VariantResponse,
} from "@flagkit/shared/schemas";
import { request, requestPage } from "../http.ts";

export type { CreateFlagInput };

const base = (projectId: string) => `/projects/${projectId}/flags`;

export const flags = {
  list: (projectId: string, params?: Partial<PaginationQuery>) =>
    requestPage<FlagResponse>({ method: "GET", url: base(projectId), params }),

  get: (projectId: string, flagId: string) =>
    request<FlagResponse>({ method: "GET", url: `${base(projectId)}/${flagId}` }),

  create: (projectId: string, body: CreateFlagInput) =>
    request<FlagResponse>({ method: "POST", url: base(projectId), data: body }),

  update: (projectId: string, flagId: string, body: UpdateFlagBody) =>
    request<FlagResponse>({ method: "PATCH", url: `${base(projectId)}/${flagId}`, data: body }),

  evaluate: (projectId: string, flagId: string, context: EvaluationContext) =>
    request<TestFlagResponse>({
      method: "POST",
      url: `${base(projectId)}/${flagId}/evaluate`,
      data: context,
    }),

  replaceRules: (projectId: string, flagId: string, rules: ReplaceRulesInput["rules"]) =>
    request<RuleResponse[]>({
      method: "PUT",
      url: `${base(projectId)}/${flagId}/rules`,
      data: { rules },
    }),

  replaceVariants: (projectId: string, flagId: string, variants: VariantInput[]) =>
    request<VariantResponse[]>({
      method: "PUT",
      url: `${base(projectId)}/${flagId}/variants`,
      data: { variants },
    }),

  delete: (projectId: string, flagId: string) =>
    request<null>({ method: "DELETE", url: `${base(projectId)}/${flagId}` }),
};
