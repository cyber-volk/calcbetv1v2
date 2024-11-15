'use client'

import { useState, useEffect } from 'react'
import { Site, Form, VoiceLanguage } from './types'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useVoiceInput } from './hooks/useVoiceInput'
import { SiteCarousel } from './components/SiteCarousel'
import { FormNavigation } from './components/FormNavigation'
import { LanguageSelector } from './components/LanguageSelector'
import { CalculatorForm } from './components/CalculatorForm'
import { HistorySlider } from './components/HistorySlider'
import { VoiceFeedback } from './components/VoiceInput/VoiceFeedback'
import { SITE_COLORS } from './constants'

export const Calculator = () => {
  const [mounted, setMounted] = useState(false)
  const [voiceLanguage, setVoiceLanguage] = useState<VoiceLanguage>('none')
  const [isListening, setIsListening] = useState(false)

  // LocalStorage hooks
  const [sites, setSites] = useLocalStorage<Site[]>('calculator-sites', [
    {
      id: '1',
      name: 'Default Site',
      color: 'none',
      forms: [{
        id: '1',
        result: '',
        timestamp: new Date().toISOString(),
        creditRows: [{ totalClient: '', details: '', client: '' }],
        creditPayeeRows: [{ totalPayee: '', details: '', client: '' }],
        depenseRows: [{ totalDepense: '', details: '', client: '' }],
        retraitRows: [{ retraitPayee: '', retrait: '', client: '' }],
        fond: '',
        soldeALinstant: '',
        soldeDeDebut: '',
        site: 'Default Site',
        multiplier: '1.1',
        calculationHistory: []
      }],
      statistics: {
        lastUpdated: new Date().toISOString()
      }
    }
  ])
  const [currentSiteIndex, setCurrentSiteIndex] = useLocalStorage('current-site-index', 0)
  const [currentFormIndex, setCurrentFormIndex] = useLocalStorage('current-form-index', 0)

  // Voice input hook
  const { handleVoiceInputWithFeedback } = useVoiceInput(voiceLanguage, setIsListening)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSiteChange = (index: number) => {
    setCurrentSiteIndex(index)
    setCurrentFormIndex(0)
  }

  const handleAddSite = () => {
    const newSite: Site = {
      id: crypto.randomUUID(),
      name: `New Site ${sites.length + 1}`,
      color: 'none',
      forms: [{
        id: crypto.randomUUID(),
        result: '',
        timestamp: new Date().toISOString(),
        creditRows: [{ totalClient: '', details: '', client: '' }],
        creditPayeeRows: [{ totalPayee: '', details: '', client: '' }],
        depenseRows: [{ totalDepense: '', details: '', client: '' }],
        retraitRows: [{ retraitPayee: '', retrait: '', client: '' }],
        fond: '',
        soldeALinstant: '',
        soldeDeDebut: '',
        site: `New Site ${sites.length + 1}`,
        multiplier: '1.1',
        calculationHistory: []
      }],
      statistics: {
        lastUpdated: new Date().toISOString()
      }
    }
    setSites([...sites, newSite])
    setCurrentSiteIndex(sites.length)
    setCurrentFormIndex(0)
  }

  const handleUpdateSite = (siteIndex: number, updatedSite: Site) => {
    const newSites = [...sites]
    newSites[siteIndex] = {
      ...updatedSite,
      statistics: {
        ...updatedSite.statistics,
        lastUpdated: new Date().toISOString()
      }
    }
    setSites(newSites)
  }

  const handleDeleteSite = (siteIndex: number) => {
    if (siteIndex === 0) {
      alert("Cannot delete the default site")
      return
    }
    const newSites = sites.filter((_, index) => index !== siteIndex)
    setSites(newSites)
    if (currentSiteIndex >= siteIndex) {
      setCurrentSiteIndex(Math.max(0, currentSiteIndex - 1))
    }
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full m-0 p-0">
        <div className={`w-full rounded-none sm:rounded-3xl shadow-lg sm:p-8 mt-0 sm:mt-12 mb-20 sm:max-w-7xl sm:mx-auto ${SITE_COLORS[sites[currentSiteIndex]?.color || 'none'].bg}`}>
          <SiteCarousel
            sites={sites}
            currentSiteIndex={currentSiteIndex}
            onSiteChange={handleSiteChange}
            onAddSite={handleAddSite}
            onUpdateSite={handleUpdateSite}
            onDeleteSite={handleDeleteSite}
          />

          <FormNavigation
            currentFormIndex={currentFormIndex}
            totalForms={sites[currentSiteIndex].forms.length}
            onPreviousForm={() => setCurrentFormIndex(Math.max(0, currentFormIndex - 1))}
            onNextForm={() => setCurrentFormIndex(Math.min(sites[currentSiteIndex].forms.length - 1, currentFormIndex + 1))}
            onAddForm={() => {
              const newForms = [...sites[currentSiteIndex].forms, {
                id: crypto.randomUUID(),
                result: '',
                timestamp: new Date().toISOString(),
                creditRows: [{ totalClient: '', details: '', client: '' }],
                creditPayeeRows: [{ totalPayee: '', details: '', client: '' }],
                depenseRows: [{ totalDepense: '', details: '', client: '' }],
                retraitRows: [{ retraitPayee: '', retrait: '', client: '' }],
                fond: '',
                soldeALinstant: '',
                soldeDeDebut: '',
                site: sites[currentSiteIndex].name,
                multiplier: '1.1',
                calculationHistory: []
              }]
              handleUpdateSite(currentSiteIndex, { ...sites[currentSiteIndex], forms: newForms })
              setCurrentFormIndex(newForms.length - 1)
            }}
          />

          <LanguageSelector
            selectedLanguage={voiceLanguage}
            onLanguageChange={setVoiceLanguage}
          />

          <CalculatorForm
            form={sites[currentSiteIndex].forms[currentFormIndex]}
            onUpdateForm={(updatedForm) => {
              const newForms = [...sites[currentSiteIndex].forms]
              newForms[currentFormIndex] = updatedForm
              handleUpdateSite(currentSiteIndex, { ...sites[currentSiteIndex], forms: newForms })
            }}
            onDeleteForm={() => {
              if (sites[currentSiteIndex].forms.length === 1) {
                alert("Cannot delete the last form")
                return
              }
              const newForms = sites[currentSiteIndex].forms.filter((_, index) => index !== currentFormIndex)
              handleUpdateSite(currentSiteIndex, { ...sites[currentSiteIndex], forms: newForms })
              setCurrentFormIndex(Math.max(0, currentFormIndex - 1))
            }}
            handleVoiceInputWithFeedback={handleVoiceInputWithFeedback}
            voiceLanguage={voiceLanguage}
          />

          <HistorySlider
            forms={sites[currentSiteIndex].forms}
            currentFormIndex={currentFormIndex}
            onFormSelect={(index: number, historicalForm?: Form) => {
              setCurrentFormIndex(index)
              if (historicalForm) {
                const newForms = [...sites[currentSiteIndex].forms]
                newForms[index] = historicalForm
                handleUpdateSite(currentSiteIndex, { ...sites[currentSiteIndex], forms: newForms })
              }
            }}
            siteColor={sites[currentSiteIndex].color || 'none'}
          />
        </div>
      </div>
      <VoiceFeedback isListening={isListening} language={voiceLanguage} />
    </div>
  )
} 