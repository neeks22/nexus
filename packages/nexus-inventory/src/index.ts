export type {
  Vehicle,
  VehicleQuery,
  VehicleMatch,
  InventoryService,
  StockStatus,
} from "./types.js";

export { CsvInventoryProvider } from "./csv-provider.js";

export { extractHighlights, formatForAI } from "./feature-extractor.js";

export { addFreshnessQualifier, isStale } from "./freshness.js";
