import { Form, CreditRow, CreditPayeeRow, DepenseRow, RetraitRow } from '../types'

export const calculateTotal = (form: Form): number => {
  const validatedSoldeALinstant = validateInput(form.soldeALinstant) || 0
  const validatedFond = validateInput(form.fond) || 0
  const validatedSoldeDeDebut = validateInput(form.soldeDeDebut)

  if (validatedSoldeDeDebut === null) return 0

  const totalRetrait = form.retraitRows.reduce((total: number, row: RetraitRow) => 
    total + parseFloat(row.retrait || '0'), 0)
  
  const totalRetraitPayee = form.retraitRows.reduce((total: number, row: RetraitRow) => {
    if (row.retraitPayee === 'OK') {
      return total + parseFloat(row.retrait || '0')
    }
    return total + parseFloat(row.retraitPayee || '0')
  }, 0)

  const totalCredit = form.creditRows.reduce((total: number, row: CreditRow) => 
    total + parseFloat(row.totalClient || '0'), 0)
  
  const totalCreditPayee = form.creditPayeeRows.reduce((total: number, row: CreditPayeeRow) => 
    total + parseFloat(row.totalPayee || '0'), 0)

  const totalDepense = form.depenseRows.reduce((total: number, row: DepenseRow) => 
    total + parseFloat(row.totalDepense || '0'), 0)
  
  const selectedMultiplier = parseFloat(form.multiplier)

  return ((validatedSoldeDeDebut + totalRetrait) - validatedSoldeALinstant) * selectedMultiplier - 
         totalRetraitPayee - totalDepense - totalCredit + totalCreditPayee + validatedFond
}

const validateInput = (value: string): number | null => {
  if (!value) return 0

  if (value.includes('+')) {
    const numbers = value.split('+')
      .map(num => parseFloat(num.trim()))
      .filter(num => !isNaN(num))
    return numbers.reduce((acc, num) => acc + num, 0)
  }

  const parsed = parseFloat(value)
  return isNaN(parsed) ? null : parsed
} 