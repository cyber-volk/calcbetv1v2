import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'

interface FormNavigationProps {
  currentFormIndex: number
  totalForms: number
  onPreviousForm: () => void
  onNextForm: () => void
  onAddForm: () => void
}

export const FormNavigation = ({
  currentFormIndex,
  totalForms,
  onPreviousForm,
  onNextForm,
  onAddForm
}: FormNavigationProps) => {
  return (
    <div className="flex items-center justify-between mb-4">
      <button
        onClick={onPreviousForm}
        disabled={currentFormIndex === 0}
        className="p-2 rounded-full bg-gray-200 disabled:opacity-50"
        aria-label="Previous form"
      >
        <ChevronLeft size={24} />
      </button>
      <div className="flex items-center">
        <span className="text-lg font-semibold mr-2">
          Form {currentFormIndex + 1} / {totalForms}
        </span>
        <button
          onClick={onAddForm}
          className="p-1 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors"
          aria-label="Add new form"
        >
          <Plus size={20} />
        </button>
      </div>
      <button
        onClick={onNextForm}
        disabled={currentFormIndex === totalForms - 1}
        className="p-2 rounded-full bg-gray-200 disabled:opacity-50"
        aria-label="Next form"
      >
        <ChevronRight size={24} />
      </button>
    </div>
  )
} 