import { Plus, Trash2 } from 'lucide-react'
import { VoiceLanguage } from '../../types'
import { VoiceInputButton } from '../VoiceInput/VoiceInputButton'

interface TableSectionProps {
  title: string
  rows: any[]
  onAddRow: () => void
  onRemoveRow: (index: number) => void
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, index: number, field: string) => void
  onVoiceInput: (index: number, field: string) => void
  voiceLanguage: VoiceLanguage
  fields: string[]
  readOnlyFields?: string[]
}

export const TableSection = ({
  title,
  rows,
  onAddRow,
  onRemoveRow,
  onInputChange,
  onVoiceInput,
  voiceLanguage,
  fields,
  readOnlyFields = []
}: TableSectionProps) => {
  return (
    <div>
      <div className="flex items-center mb-4">
        <h3 className="text-xl font-semibold flex-1 text-center">{title}</h3>
        <button
          type="button"
          onClick={onAddRow}
          className="p-1 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors"
          aria-label={`Add new ${title} row`}
        >
          <Plus size={20} />
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <colgroup>
            <col className="w-[40px]" />
            {fields.map((_, index) => (
              <col key={index} className={index === 0 ? "w-[50px] sm:w-[70px]" : ""} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th className="p-2"></th>
              {fields.map((field) => (
                <th key={field} className="p-2 text-left font-medium text-gray-700">
                  {field.charAt(0).toUpperCase() + field.slice(1)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <td className="p-2">
                  <button
                    type="button"
                    onClick={() => onRemoveRow(rowIndex)}
                    className="text-red-500 hover:text-red-700"
                    aria-label={`Remove ${title} row ${rowIndex + 1}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
                {fields.map((field) => (
                  <td key={field} className="p-2">
                    <div className="relative">
                      {readOnlyFields.includes(field) ? (
                        <input
                          type="text"
                          value={row[field]}
                          readOnly
                          className="w-full bg-gray-50 text-right font-mono px-2 py-1 rounded"
                        />
                      ) : (
                        <textarea
                          value={row[field]}
                          onChange={(e) => onInputChange(e, rowIndex, field)}
                          placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                          className="w-full min-h-[38px] resize-none overflow-hidden px-2 py-1 rounded whitespace-normal break-words font-mono text-base leading-relaxed text-right"
                          rows={1}
                          onInput={(e) => {
                            e.currentTarget.style.height = 'auto'
                            const newHeight = Math.max(38, e.currentTarget.scrollHeight)
                            e.currentTarget.style.height = `${newHeight}px`
                          }}
                        />
                      )}
                      {!readOnlyFields.includes(field) && (
                        <VoiceInputButton
                          onVoiceInput={() => onVoiceInput(rowIndex, field)}
                          showButton={voiceLanguage !== 'none'}
                          voiceLanguage={voiceLanguage}
                        />
                      )}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
} 