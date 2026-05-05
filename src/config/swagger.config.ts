import swaggerJsdoc from "swagger-jsdoc";
import { apiReference } from "@scalar/express-api-reference";
import helmet from "helmet";
import type { Application } from "express";

const spec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: { title: "My API", version: "1.0.0" },
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
  },
  apis: ["./src/modules/**/*.routes.ts"],
});

// Hashes reported by the browser for Scalar's bootstrapping inline scripts.
// These are deterministic for a given Scalar version — update when upgrading.
const SCALAR_SCRIPT_HASHES = [
  "'sha256-ieoeWczDHkReVBsRBqaal5AFMlBtNjMzgwKvLqi/tSU='",
  "'sha256-wymiosKG2k+87jnwoXk0Hbgi4oH+QmIIUkSfzBhi5Zs='",
];

const docsHelmet = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "https://cdn.jsdelivr.net",
        ...SCALAR_SCRIPT_HASHES,
      ],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://cdn.jsdelivr.net"],
      workerSrc: ["'self'", "blob:"],
    },
  },
});

export const registerDocs = (app: Application): void => {
  app.get("/openapi.json", (_req, res) => res.json(spec));

  app.use(
    "/docs",
    docsHelmet,
    apiReference({
      url: "/openapi.json",
      theme: "purple",
    })
  );
};