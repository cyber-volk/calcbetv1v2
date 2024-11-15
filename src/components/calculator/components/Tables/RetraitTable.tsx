import { RetraitRow } from '../../types'
import { TableSection } from './TableSection'
import { VoiceLanguage } from '../../types'

interface RetraitTableProps {
  rows: RetraitRow[]
  onAddRow: () => void
  onRemoveRow: (index: number) => void
  onUpdateRow: (index: number, field: keyof RetraitRow, value: string) => void
  handleVoiceInputWithFeedback: (callback: (value: string) => void, isNumberField?: boolean) => void
  voiceLanguage: VoiceLanguage
}

export const RetraitTable = ({
  rows,
  onAddRow,
  onRemoveRow,
  onUpdateRow,
  handleVoiceInputWithFeedback,
  voiceLanguage
}: RetraitTableProps) => {
  return (
    <TableSection
      title="Retrait"
      rows={rows}
      onAddRow={onAddRow}
      onRemoveRow={onRemoveRow}
      onInputChange={(e, index, field) => onUpdateRow(index, field as keyof RetraitRow, e.target.value)}
      onVoiceInput={(index, field) => 
        handleVoiceInputWithFeedback(
          (value) => onUpdateRow(index, field as keyof RetraitRow, value),
          field === 'retrait' || field === 'retraitPayee'
        )
      }
      voiceLanguage={voiceLanguage}
      fields={['retraitPayee', 'retrait', 'client']}
    />
  )
} 