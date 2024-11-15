import { useRef, useState, useEffect } from 'react'
import { Clock } from 'lucide-react'
import { Form, SiteColor } from '../../types'
import { SITE_COLORS } from '../../constants'
import { FormPreview } from './FormPreview'

interface HistorySliderProps {
  forms: Form[]
  currentFormIndex: number
  onFormSelect: (index: number, historicalForm?: Form) => void
  siteColor: SiteColor
}

export const HistorySlider = ({
  forms,
  currentFormIndex,
  onFormSelect,
  siteColor
}: HistorySliderProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const sliderRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && sliderRef.current) {
      sliderRef.current.scrollLeft = sliderRef.current.scrollWidth
    }
  }, [isOpen, forms])

  return (
    <div 
      className={`fixed bottom-0 left-0 right-0 ${isOpen ? 'h-64' : 'h-12'} transition-all duration-300 ease-in-out ${SITE_COLORS[siteColor].bg}`}
      role="complementary"
      aria-label="Form history"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full 
          ${SITE_COLORS[siteColor].bg} ${SITE_COLORS[siteColor].hover} flex items-center justify-center shadow-lg`}
        aria-expanded={isOpen}
        aria-controls="history-slider"
        aria-label="Toggle history slider"
      >
        <Clock 
          size={24} 
          className={`transform ${isOpen ? 'rotate-180' : ''} transition-transform duration-300`}
        />
      </button>
      
      {isOpen && (
        <div
          id="history-slider"
          ref={sliderRef}
          className="h-full overflow-x-auto whitespace-nowrap py-4 px-2 flex items-center space-x-4"
          role="list"
        >
          {forms.map((form, index) => (
            <FormPreview
              key={form.id}
              form={form}
              isActive={index === currentFormIndex}
              onSelect={() => onFormSelect(index)}
              onHistoricalFormSelect={(historicalForm) => onFormSelect(index, historicalForm)}
            />
          ))}
        </div>
      )}
    </div>
  )
} 