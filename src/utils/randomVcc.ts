export const randomVCC = (): number => {
  const randomVirtualCreditCard: string = Math.random()
    .toString()
    .replace('0.', '');
  const visaCreditCard: any = parseInt(4 + randomVirtualCreditCard);
  const pattern: RegExpExecArray | null = /\d{16}/.exec(visaCreditCard);
  const ccNumber: string =
    pattern && pattern.length > 0 ? pattern.join('') : '';
  return typeof +ccNumber === 'number' && +ccNumber ? +ccNumber : -1;
};
