import { useState } from 'react'
import { Languages } from 'lucide-react'
import { VoiceLanguage } from '../../types'
import { LANGUAGE_OPTIONS } from '../../constants'

interface LanguageSelectorProps {
  selectedLanguage: VoiceLanguage
  onLanguageChange: (lang: VoiceLanguage) => void
}

export const LanguageSelector = ({ 
  selectedLanguage, 
  onLanguageChange 
}: LanguageSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label={`Select language. Current: ${LANGUAGE_OPTIONS.find(lang => lang.code === selectedLanguage)?.label}`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <Languages size={20} />
        <span>{LANGUAGE_OPTIONS.find(lang => lang.code === selectedLanguage)?.flag}</span>
      </button>
      
      {isOpen && (
        <div 
          className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50"
          role="listbox"
          aria-label="Language options"
        >
          {LANGUAGE_OPTIONS.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                onLanguageChange(lang.code)
                setIsOpen(false)
              }}
              className={`w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 ${
                selectedLanguage === lang.code ? 'bg-gray-50' : ''
              }`}
              role="option"
              aria-selected={selectedLanguage === lang.code}
            >
              <span>{lang.flag}</span>
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
} 