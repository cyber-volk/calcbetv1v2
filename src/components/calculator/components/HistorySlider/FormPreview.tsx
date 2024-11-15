import { Form } from '../../types'

interface FormPreviewProps {
  form: Form
  isActive: boolean
  onSelect: () => void
  onHistoricalFormSelect: (historicalForm: Form) => void
}

export const FormPreview = ({
  form,
  isActive,
  onSelect,
  onHistoricalFormSelect
}: FormPreviewProps) => {
  return (
    <div
      className={`inline-block p-4 rounded-lg shadow-md cursor-pointer transition-all duration-200 ${
        isActive ? 'bg-white scale-105' : 'bg-gray-100 hover:bg-gray-200'
      }`}
      onClick={onSelect}
      role="listitem"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onSelect()
        }
      }}
    >
      <p className="font-semibold">{form.result || 'No result'}</p>
      <p className="text-sm text-gray-500">
        {new Date(form.timestamp).toLocaleString()}
      </p>
      {form.calculationHistory && form.calculationHistory.length > 0 && (
        <div className="mt-2">
          <p className="text-sm font-semibold">History:</p>
          {form.calculationHistory.map((historicalForm, historyIndex) => (
            <div
              key={historyIndex}
              className="text-xs text-gray-600 hover:text-gray-800 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation()
                onHistoricalFormSelect(historicalForm)
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation()
                  onHistoricalFormSelect(historicalForm)
                }
              }}
            >
              {historicalForm.result} - {new Date(historicalForm.timestamp).toLocaleString()}
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 