export type Environment = "dev" | "production" | "test" | "staging";

/**
 * Resolves the runtime environment from NODE_ENV.
 * Unset or unrecognised values fall back to "development".
 */
export function getEnvironment(): Environment {
  switch (process.env.NODE_ENV) {
    case "production":
      return "production";
    case "test":
      return "test";
    default:
      return "dev";
  }
}

export const isProduction = (): boolean => getEnvironment() === "production";
export const isDevelopment = (): boolean => getEnvironment() === "dev";
export const isTest = (): boolean => getEnvironment() === "test";
