import { z } from "zod";

export const priceIdSchema = z.string().regex(/^pri_[a-z\d]{26}$/);
export const transactionIdSchema = z.string().regex(/^txn_[a-z\d]{26}$/);
export const adjustmentIdSchema = z.string().regex(/^adj_[a-z\d]{26}$/);
export type Catalog = readonly {
  readonly priceId: string;
  readonly credits: number;
  readonly active: boolean;
}[];
