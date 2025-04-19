"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("../../../libs/logger/src");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const helmet_1 = require("helmet");
const app_module_1 = require("./app.module");
const metrics_module_1 = require("./metrics/metrics.module");
BigInt.prototype.toJSON = function () { return String(this); };
async function bootstrap() {
    const logger = (0, logger_1.getLogger)(process.env.NODE_ENV, process.env.LOG_LEVEL);
    process.on("uncaughtException", function (error) {
        logger.error(error.message, error.stack, "UnhandledExceptions");
        process.exit(1);
    });
    const app = await core_1.NestFactory.create(app_module_1.AppModule, { logger, });
    const configService = app.get(config_1.ConfigService);
    const metricsApp = await core_1.NestFactory.create(metrics_module_1.MetricsModule);
    metricsApp.enableShutdownHooks();
    app.enableCors({
        origin: "*",
        methods: "GET,PATCH,POST,DELETE",
        preflightContinue: false,
        optionsSuccessStatus: 204,
    });
    app.setGlobalPrefix("api");
    app.use((0, helmet_1.default)());
    app.enableShutdownHooks();
    app.useGlobalPipes(new common_1.ValidationPipe({
        disableErrorMessages: process.env.DISABLE_ERROR_MESSAGES === "true",
        transform: true,
        whitelist: true,
    }));
    await app.listen(configService.get("port"));
    await metricsApp.listen(configService.get("metrics.port"));
}
bootstrap();
//# sourceMappingURL=main.js.map