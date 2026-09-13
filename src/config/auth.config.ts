import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "./database.config";
import { env } from "./env.config";
import logger from "./logger.config";

export const auth = betterAuth({
    // The public origin the browser talks to. The Next.js app rewrites
    // /api/auth/* to this server, so the Google redirect URI resolves to
    // `${BETTER_AUTH_URL}/api/auth/callback/google` and cookies stay first-party.
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.BETTER_AUTH_URL],
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    emailAndPassword: {
        enabled: true,
    },
    socialProviders: {
        google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            prompt: "select_account",
        },
    },
    account: {
        accountLinking: {
            // Never merge a Google sign-in into an existing account just because
            // the emails match — a password account may have an unverified email.
            // Linking stays available explicitly via linkSocial() while signed in.
            disableImplicitLinking: true,
        },
    },
    logger: {
        log: (level, message, ...args) => {
            logger.log(level, `[better-auth] ${message}`, { args });
        },
    },
    onAPIError: {
        // OAuth failures land on the login page as ?error=<code>.
        errorURL: `${env.BETTER_AUTH_URL}/login`,
        onError: (error) => {
            logger.error("Better Auth API error", {
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
            });
        },
    },
});

// TypeScript types infer karo better-auth se
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
