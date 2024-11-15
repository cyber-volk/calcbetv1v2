import { CreditRow } from '../../types'
import { TableSection } from './TableSection'
import { VoiceLanguage } from '../../types'

interface CreditTableProps {
  rows: CreditRow[]
  onAddRow: () => void
  onRemoveRow: (index: number) => void
  onUpdateRow: (index: number, field: keyof CreditRow, value: string) => void
  handleVoiceInputWithFeedback: (callback: (value: string) => void, isNumberField?: boolean) => void
  voiceLanguage: VoiceLanguage
}

export const CreditTable = ({
  rows,
  onAddRow,
  onRemoveRow,
  onUpdateRow,
  handleVoiceInputWithFeedback,
  voiceLanguage
}: CreditTableProps) => {
  return (
    <TableSection
      title="Crédit"
      rows={rows}
      onAddRow={onAddRow}
      onRemoveRow={onRemoveRow}
      onInputChange={(e, index, field) => onUpdateRow(index, field as keyof CreditRow, e.target.value)}
      onVoiceInput={(index, field) => 
        handleVoiceInputWithFeedback(
          (value) => onUpdateRow(index, field as keyof CreditRow, value),
          field === 'totalClient'
        )
      }
      voiceLanguage={voiceLanguage}
      fields={['totalClient', 'details', 'client']}
      readOnlyFields={['totalClient']}
    />
  )
} 