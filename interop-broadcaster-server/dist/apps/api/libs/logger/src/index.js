"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLogger = void 0;
const nest_winston_1 = require("nest-winston");
const winston_1 = require("winston");
const getLogger = (environment, logLevel) => {
    let defaultLogLevel = "debug";
    const loggerFormatters = [
        environment === "production"
            ? winston_1.format.timestamp()
            : winston_1.format.timestamp({ format: "DD/MM/YYYY HH:mm:ss.SSS", }),
        winston_1.format.ms(),
        nest_winston_1.utilities.format.nestLike("API", {}),
    ];
    if (environment === "production") {
        defaultLogLevel = "info";
        loggerFormatters.push(winston_1.format.json());
    }
    return nest_winston_1.WinstonModule.createLogger({
        level: logLevel || defaultLogLevel,
        transports: [new winston_1.transports.Console({ format: winston_1.format.combine(...loggerFormatters), }),],
    });
};
exports.getLogger = getLogger;
//# sourceMappingURL=index.js.map