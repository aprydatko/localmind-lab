const defaultAccount = {
  currency: 'UAH',
  available: 12450.75,
  transactions: [
    { date: '2026-06-07', description: 'Grocery store', amount: -842.30 },
    { date: '2026-06-06', description: 'Salary', amount: 32000 },
    { date: '2026-06-05', description: 'Internet', amount: -399 }
  ]
}

const ratesToUah = { UAH: 1, USD: 41.25, EUR: 47.10 }

export class BankingService {
  constructor(accountState = defaultAccount) {
    // Clone to prevent mutating default account across requests if modified
    this.account = JSON.parse(JSON.stringify(accountState))
  }

  getBalance() {
    return { currency: this.account.currency, available: this.account.available }
  }

  getTransactions(limit = 5) {
    return this.account.transactions.slice(0, limit)
  }

  getExchangeRate(from, to) {
    return {
      from,
      to,
      rate: ratesToUah[from] / ratesToUah[to],
      mock: true
    }
  }

  executeTool(name, args) {
    if (name === 'get_balance') {
      return this.getBalance()
    }
    if (name === 'get_transactions') {
      return this.getTransactions(args.limit)
    }
    if (name === 'get_exchange_rate') {
      return this.getExchangeRate(args.from, args.to)
    }
    throw new Error(`Unknown tool: ${name}`)
  }
}
