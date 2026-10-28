import { z } from "zod";
import { PUSH_EVENTS } from "@/domain/notifications/messages";

/** PushSubscription serializada (toJSON) que manda el navegador. */
export const pushSubscriptionSchema = z.object({
  endpoint: z.url({ protocol: /^https$/ }).max(1000),
  keys: z.object({
    p256dh: z.string().min(1).max(200),
    auth: z.string().min(1).max(100),
  }),
});

export const endpointSchema = z.object({ endpoint: z.string().min(1).max(1000) });

export const preferenceSchema = z.object({
  event: z.enum(PUSH_EVENTS as [string, ...string[]]),
  enabled: z.boolean(),
});
