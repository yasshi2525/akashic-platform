export const authProviders = ["google", "twitter", "github"] as const;
export type AuthProvider = (typeof authProviders)[number];
export const authProviderNames: Record<AuthProvider, string> = {
    google: "Google",
    twitter: "X",
    github: "GitHub",
};
