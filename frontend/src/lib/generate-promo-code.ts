export default function generatePromoCode(length = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  const array = new Uint8Array(length);
  crypto.getRandomValues(array);

  return Array.from(array)
    .map((x) => chars[x % chars.length])
    .join("");
}
