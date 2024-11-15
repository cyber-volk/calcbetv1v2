import { DepenseRow } from '../../types'
import { TableSection } from './TableSection'
import { VoiceLanguage } from '../../types'

interface DepenseTableProps {
  rows: DepenseRow[]
  onAddRow: () => void
  onRemoveRow: (index: number) => void
  onUpdateRow: (index: number, field: keyof DepenseRow, value: string) => void
  handleVoiceInputWithFeedback: (callback: (value: string) => void, isNumberField?: boolean) => void
  voiceLanguage: VoiceLanguage
}

export const DepenseTable = ({
  rows,
  onAddRow,
  onRemoveRow,
  onUpdateRow,
  handleVoiceInputWithFeedback,
  voiceLanguage
}: DepenseTableProps) => {
  return (
    <TableSection
      title="Dépense"
      rows={rows}
      onAddRow={onAddRow}
      onRemoveRow={onRemoveRow}
      onInputChange={(e, index, field) => onUpdateRow(index, field as keyof DepenseRow, e.target.value)}
      onVoiceInput={(index, field) => 
        handleVoiceInputWithFeedback(
          (value) => onUpdateRow(index, field as keyof DepenseRow, value),
          field === 'totalDepense'
        )
      }
      voiceLanguage={voiceLanguage}
      fields={['totalDepense', 'details', 'client']}
      readOnlyFields={['totalDepense']}
    />
  )
} 