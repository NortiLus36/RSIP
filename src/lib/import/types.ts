export const datasetKinds = [
  "product",
  "inventory",
  "sales",
  "traffic",
  "experience",
] as const;
export type DatasetKind = (typeof datasetKinds)[number];
export type DataRow = Record<string, string | number | boolean>;
export interface ImportedDataset {
  rows: DataRow[];
  fileName: string;
  importedAt: string;
}
export type ImportBundle = Partial<Record<DatasetKind, ImportedDataset>>;
export interface Issue {
  level: "error" | "warning";
  row: number;
  field: string;
  message: string;
}
export interface ParsedTable {
  headers: string[];
  rows: string[][];
  warnings: string[];
}
export type ColumnMapping = Record<string, string>;
export const importLimits = {
  coverageDays: 31,
  fileBytes: 5 * 1024 * 1024,
  rows: 10000,
  columns: 64,
  cellLength: 2000,
  expandedBytes: 25 * 1024 * 1024,
};
export interface Field {
  name: string;
  type: "text" | "number" | "integer" | "boolean" | "date" | "datetime";
  required: boolean;
  description: string;
  example: string;
}
