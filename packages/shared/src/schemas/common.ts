import { z } from "zod";

export const IdParams = z.object({ id: z.uuid() });
export type IdParams = z.infer<typeof IdParams>;
