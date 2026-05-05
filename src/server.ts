import app from "./app";
import { env } from "./config/env.config";
import logger from "./config/logger.config";

const PORT = env.PORT;

app.listen(PORT, () => {
  logger.info(`✅  Server running on port ${PORT} [${env.NODE_ENV}]`);
});
