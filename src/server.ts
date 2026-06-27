import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { Connection } from "@solana/web3.js";
import { ZodError } from "zod";
import { loadConfig, type LaunchpadConfig } from "./config.js";
import { quoteCreationFee } from "./fees.js";
import { getRentEstimates, prepareLaunchTransaction } from "./solana/launchTransaction.js";
import { parseLaunchRequest } from "./validation.js";

export function createApp(config: LaunchpadConfig = loadConfig()): express.Express {
  const app = express();
  const connection = new Connection(config.rpcUrl, "confirmed");

  app.use(cors({ origin: process.env.CORS_ORIGIN ?? true }));
  app.use(express.json({ limit: "64kb" }));

  app.get("/health", (_request, response) => {
    response.json({ ok: true, cluster: config.cluster });
  });

  app.get("/api/config", (_request, response) => {
    response.json({
      cluster: config.cluster,
      rpcUrl: config.rpcUrl,
      platformFeeLamports: config.platformFeeLamports.toString(),
      feeVault: config.feeVault.toBase58(),
      defaultDecimals: config.defaultDecimals,
      maxInitialSupply: config.maxInitialSupply.toString()
    });
  });

  app.post("/api/quote", async (request, response, next) => {
    try {
      parseLaunchRequest(request.body, config);
      const rent = await getRentEstimates(connection);
      response.json(quoteCreationFee(config, rent));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/launches/prepare", async (request, response, next) => {
    try {
      const launchRequest = parseLaunchRequest(request.body, config);
      response.json(await prepareLaunchTransaction(connection, config, launchRequest));
    } catch (error) {
      next(error);
    }
  });

  app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    if (error instanceof ZodError) {
      response.status(400).json({
        error: "Invalid launch request",
        details: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      });
      return;
    }

    if (error instanceof Error) {
      response.status(400).json({ error: error.message });
      return;
    }

    response.status(500).json({ error: "Unexpected server error" });
  });

  return app;
}

if (process.env.NODE_ENV !== "test") {
  const port = Number(process.env.PORT ?? "3000");
  createApp().listen(port, () => {
    console.log(`Launchpad API listening on http://localhost:${port}`);
  });
}
