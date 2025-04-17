import type { Provider, } from "@nestjs/common";
import { makeHistogramProvider, } from "@willsoto/nestjs-prometheus";

export const REQUEST_DURATION_METRIC_NAME = "request_duration_seconds";
export type RequestDurationMetricLabels = "method" | "statusCode" | "path";

export const metricProviders: Provider<any>[] = [
  makeHistogramProvider({
    name: REQUEST_DURATION_METRIC_NAME,
    help: "HTTP request processing duration in seconds.",
    labelNames: [
      "method",
      "path",
      "statusCode",
    ],
  },),
];
