import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "./database.config";

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql", // or "mysql", "postgresql", ...etc
    }),
});

// TypeScript types infer karo better-auth se
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;