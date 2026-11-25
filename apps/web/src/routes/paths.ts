/** Every URL in the app, in one place. */
export const paths = {
  landing: "/",
  login: "/login",
  signup: "/signup",
  dashboard: "/dashboard",
  newFlag: "/dashboard/flags/new",
  flag: (flagId: string) => `/dashboard/flags/${flagId}`,
  flagPattern: "/dashboard/flags/:flagId",
} as const;
