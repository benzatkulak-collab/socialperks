// Compile-time ties between the response schemas and the read model. This is a
// plain module (tsconfig excludes tests from `tsc --noEmit`), imported by
// nothing at runtime: if a field is renamed, added or dropped on one side only,
// `npx tsc --noEmit` fails here.
import type { z } from "zod";
import type { BusinessWeek, grantedBusinesses } from "./week";
import type { businessWeekSchema, partnerBusinessesResponse } from "./schemas";

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Assert<T extends true> = T;

type Listed = Awaited<ReturnType<typeof grantedBusinesses>>;

export type BusinessWeekMatchesSchema = Assert<Equal<z.infer<typeof businessWeekSchema>, BusinessWeek>>;
export type BusinessesMatchSchema = Assert<Equal<z.infer<typeof partnerBusinessesResponse>["businesses"], Listed>>;
