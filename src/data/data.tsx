const parsedAmount = Number(process.env.NEXT_PUBLIC_PAYMENT_AMOUNT ?? "1");

export const upiId = process.env.NEXT_PUBLIC_UPI_ID ?? "";
export const payeeName = process.env.NEXT_PUBLIC_PAYEE_NAME ?? "Demo Merchant";
export const amount = Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : 1;