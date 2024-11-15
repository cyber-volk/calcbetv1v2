import { CreditPayeeRow } from '../../types'
import { TableSection } from './TableSection'
import { VoiceLanguage } from '../../types'

interface CreditPayeeTableProps {
  rows: CreditPayeeRow[]
  onAddRow: () => void
  onRemoveRow: (index: number) => void
  onUpdateRow: (index: number, field: keyof CreditPayeeRow, value: string) => void
  handleVoiceInputWithFeedback: (callback: (value: string) => void, isNumberField?: boolean) => void
  voiceLanguage: VoiceLanguage
}

export const CreditPayeeTable = ({
  rows,
  onAddRow,
  onRemoveRow,
  onUpdateRow,
  handleVoiceInputWithFeedback,
  voiceLanguage
}: CreditPayeeTableProps) => {
  return (
    <TableSection
      title="Crédit Payée"
      rows={rows}
      onAddRow={onAddRow}
      onRemoveRow={onRemoveRow}
      onInputChange={(e, index, field) => onUpdateRow(index, field as keyof CreditPayeeRow, e.target.value)}
      onVoiceInput={(index, field) => 
        handleVoiceInputWithFeedback(
          (value) => onUpdateRow(index, field as keyof CreditPayeeRow, value),
          field === 'totalPayee'
        )
      }
      voiceLanguage={voiceLanguage}
      fields={['totalPayee', 'details', 'client']}
      readOnlyFields={['totalPayee']}
    />
  )
} 