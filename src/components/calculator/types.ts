// Types and interfaces
export type VoiceLanguage = 'none' | 'ar-SA' | 'fr-FR' | 'en-US'
export type SiteColor = 'blue' | 'green' | 'yellow' | 'purple' | 'red' | 'none'
export type ErrorKeys = 'fond' | 'soldeALinstant' | 'soldeDeDebut' | 'credit' | 'creditPayee' | 'depense' | 'retrait' | 'site'
export type Errors = Record<ErrorKeys, string>

export interface CreditRow {
  totalClient: string
  details: string
  client: string
}

export interface CreditPayeeRow {
  totalPayee: string
  details: string
  client: string
}

export interface DepenseRow {
  totalDepense: string
  details: string
  client: string
}

export interface RetraitRow {
  retraitPayee: string
  retrait: string
  client: string
}

export interface Form {
  id: string
  result: string
  timestamp: string
  creditRows: CreditRow[]
  creditPayeeRows: CreditPayeeRow[]
  depenseRows: DepenseRow[]
  retraitRows: RetraitRow[]
  fond: string
  soldeALinstant: string
  soldeDeDebut: string
  site: string
  multiplier: string
  calculationHistory?: Form[]
}

export interface Site {
  id: string
  name: string
  color: SiteColor
  forms: Form[]
  statistics: {
    lastUpdated: string
  }
}

export type RowField = {
  credit: keyof CreditRow
  creditPayee: keyof CreditPayeeRow
  depense: keyof DepenseRow
  retrait: keyof RetraitRow
} 