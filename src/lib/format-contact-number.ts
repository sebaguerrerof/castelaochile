export function formatContactNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  return /^569\d{8}$/.test(digits) ? `+56 9 ${digits.slice(3, 7)} ${digits.slice(7)}` : value;
}
