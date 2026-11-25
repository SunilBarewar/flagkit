/** Every URL in the app, in one place. */
export const paths = {
  landing: "/",
  login: "/login",
  signup: "/signup",
  /** Not a page: sends you to your last-used (or default) project. */
  dashboard: "/dashboard",
  projectPattern: "/project/:projectId",
  project: (projectId: string) => `/project/${projectId}`,
  flags: (projectId: string) => `/project/${projectId}/flags`,
  newFlag: (projectId: string) => `/project/${projectId}/flags/new`,
  flag: (projectId: string, flagId: string) => `/project/${projectId}/flags/${flagId}`,
  flagTest: (projectId: string, flagId: string) => `/project/${projectId}/flags/${flagId}/test`,
} as const;
