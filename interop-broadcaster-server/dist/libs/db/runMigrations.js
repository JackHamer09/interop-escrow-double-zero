"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigrations = runMigrations;
const typeorm_config_1 = require("./typeorm.config");
async function runMigrations(logger) {
    logger.log("Running migrations...");
    await typeorm_config_1.default.initialize();
    await typeorm_config_1.default.runMigrations();
    logger.log("Migrations completed.");
}
//# sourceMappingURL=runMigrations.js.map