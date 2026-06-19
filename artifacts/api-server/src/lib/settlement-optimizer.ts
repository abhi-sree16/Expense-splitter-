/**
 * SplitSmart Settlement Optimizer
 * Uses a greedy algorithm to minimize the number of transactions needed
 * to settle all debts in a group.
 *
 * Algorithm:
 * 1. Compute net balance for each member (paid - owes)
 * 2. Separate into creditors (positive balance) and debtors (negative)
 * 3. Greedily match the largest debtor with the largest creditor
 * 4. Result: at most (n-1) transactions for n members
 */

export interface NetBalance {
  memberId: number;
  memberName: string;
  avatarColor: string;
  netBalance: number;
}

export interface SettlementTransaction {
  fromMemberId: number;
  fromMemberName: string;
  toMemberId: number;
  toMemberName: string;
  amount: number;
}

export function computeOptimalSettlements(
  balances: NetBalance[]
): SettlementTransaction[] {
  const transactions: SettlementTransaction[] = [];

  const debtors: NetBalance[] = balances
    .filter((b) => b.netBalance < -0.01)
    .map((b) => ({ ...b, netBalance: b.netBalance }));

  const creditors: NetBalance[] = balances
    .filter((b) => b.netBalance > 0.01)
    .map((b) => ({ ...b }));

  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const debt = Math.abs(debtor.netBalance);
    const credit = creditor.netBalance;
    const amount = Math.min(debt, credit);

    if (amount > 0.01) {
      transactions.push({
        fromMemberId: debtor.memberId,
        fromMemberName: debtor.memberName,
        toMemberId: creditor.memberId,
        toMemberName: creditor.memberName,
        amount: Math.round(amount * 100) / 100,
      });
    }

    debtor.netBalance += amount;
    creditor.netBalance -= amount;

    if (Math.abs(debtor.netBalance) < 0.01) i++;
    if (Math.abs(creditor.netBalance) < 0.01) j++;
  }

  return transactions;
}
