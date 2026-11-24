"use client";

import { initializePaddle, type Paddle } from "@paddle/paddle-js";

const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
export const checkoutAvailable = Boolean(token);
export type CheckoutEvent = "completed" | "closed";

let onEvent: ((event: CheckoutEvent) => void) | undefined;
let paddle: Promise<Paddle | undefined> | undefined;

// Paddle.js loads on the first checkout click. Sandbox tokens start with `test_`.
export async function openCheckout(
  transactionId: string,
  handler: (event: CheckoutEvent) => void,
): Promise<boolean> {
  if (!token) return false;
  onEvent = handler;
  paddle ??= initializePaddle({
    token,
    environment: token.startsWith("test_") ? "sandbox" : "production",
    eventCallback: ({ name }) => {
      const eventName: string | undefined = name;
      if (eventName === "checkout.completed") onEvent?.("completed");
      else if (eventName === "checkout.closed") onEvent?.("closed");
    },
  }).catch((error: unknown) => {
    paddle = undefined;
    throw error;
  });
  const instance = await paddle;
  if (!instance) return false;
  instance.Checkout.open({ transactionId });
  return true;
}
