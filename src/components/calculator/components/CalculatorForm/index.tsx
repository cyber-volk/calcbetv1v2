import { useState } from 'react'
import { RotateCcw, Trash, Share2 } from 'lucide-react'
import { Form, Errors, VoiceLanguage } from '../../types'
import { VoiceInputButton } from '../VoiceInput/VoiceInputButton'
import { CreditTable, CreditPayeeTable, DepenseTable, RetraitTable } from '../Tables'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

interface CalculatorFormProps {
  form: Form
  onUpdateForm: (updatedForm: Form) => void
  onDeleteForm: () => void
  handleVoiceInputWithFeedback: (callback: (value: string) => void, isNumberField?: boolean) => void
  voiceLanguage: VoiceLanguage
}

export const CalculatorForm = ({
  form,
  onUpdateForm,
  onDeleteForm,
  handleVoiceInputWithFeedback,
  voiceLanguage
}: CalculatorFormProps) => {
  const [errors, setErrors] = useState<Errors>({
    fond: '',
    soldeALinstant: '',
    soldeDeDebut: '',
    credit: '',
    creditPayee: '',
    depense: '',
    retrait: '',
    site: ''
  })

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault()
    const validatedSoldeALinstant = validateInput(form.soldeALinstant, 'soldeALinstant') || 0
    const validatedFond = validateInput(form.fond, 'fond') || 0
    const validatedSoldeDeDebut = validateInput(form.soldeDeDebut, 'soldeDeDebut', true)

    if (validatedSoldeDeDebut === null) return

    const totalRetrait = form.retraitRows.reduce((total: number, row) => 
      total + parseFloat(row.retrait || '0'), 0)
    const totalRetraitPayee = form.retraitRows.reduce((total: number, row) => {
      if (row.retraitPayee === 'OK') {
        return total + parseFloat(row.retrait || '0')
      }
      return total + parseFloat(row.retraitPayee || '0')
    }, 0)

    const totalCredit = form.creditRows.reduce((total: number, row) => 
      total + parseFloat(row.totalClient || '0'), 0)
    const totalCreditPayee = form.creditPayeeRows.reduce((total: number, row) => 
      total + parseFloat(row.totalPayee || '0'), 0)

    const totalDepense = form.depenseRows.reduce((total: number, row) => 
      total + parseFloat(row.totalDepense || '0'), 0)
    const selectedMultiplier = parseFloat(form.multiplier)

    const total = ((validatedSoldeDeDebut + totalRetrait) - validatedSoldeALinstant) * selectedMultiplier - 
                 totalRetraitPayee - totalDepense - totalCredit + totalCreditPayee + validatedFond

    const newResult = `Total: ${total.toFixed(1)}`
    onUpdateForm({
      ...form,
      result: newResult,
      calculationHistory: [
        ...(form.calculationHistory || []),
        {
          ...form,
          result: newResult,
          timestamp: new Date().toISOString(),
          calculationHistory: []
        }
      ]
    })
  }

  const validateInput = (value: string, errorKey: keyof Errors, isMandatory = false): number | null => {
    if (value === '' && !isMandatory) {
      setErrors(prev => ({ ...prev, [errorKey]: '' }))
      return 0
    }

    if (isMandatory && !value) {
      setErrors(prev => ({ ...prev, [errorKey]: 'This field is required' }))
      return null
    }

    const numbers = value.split('+')
      .map(num => parseFloat(num.trim()))
      .filter(num => !isNaN(num))

    if (numbers.length === 0) {
      setErrors(prev => ({ ...prev, [errorKey]: 'Please enter a valid number' }))
      return null
    }

    setErrors(prev => ({ ...prev, [errorKey]: '' }))
    return numbers.reduce((acc, num) => acc + num, 0)
  }

  const handleReset = () => {
    onUpdateForm({
      ...form,
      multiplier: '1.1',
      fond: '',
      soldeALinstant: '',
      soldeDeDebut: '',
      creditRows: [{ totalClient: '', details: '', client: '' }],
      creditPayeeRows: [{ totalPayee: '', details: '', client: '' }],
      depenseRows: [{ totalDepense: '', details: '', client: '' }],
      retraitRows: [{ retraitPayee: '', retrait: '', client: '' }],
      result: ''
    })
    setErrors({
      fond: '',
      soldeALinstant: '',
      soldeDeDebut: '',
      credit: '',
      creditPayee: '',
      depense: '',
      retrait: '',
      site: ''
    })
  }

  const handleSharePDF = async () => {
    const element = document.getElementById('form-content')
    if (!element) return

    const canvas = await html2canvas(element, {
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    })
    const imgData = canvas.toDataURL('image/png')

    const pdf = new jsPDF()
    const imgProps = pdf.getImageProperties(imgData)
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
    const pdfBlob = pdf.output('blob')

    if (navigator.share) {
      const file = new File([pdfBlob], 'form.pdf', { type: 'application/pdf' })
      navigator.share({
        files: [file],
        title: 'Form PDF',
        text: 'Here is the form PDF'
      }).catch(console.error)
    } else {
      const pdfUrl = URL.createObjectURL(pdfBlob)
      window.open(pdfUrl, '_blank')
    }
  }

  return (
    <form onSubmit={handleCalculate} className="space-y-6" id="form-content">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Calculator Form</h2>
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
            aria-label="Reset form"
          >
            <RotateCcw size={20} />
          </button>
          <button
            type="button"
            onClick={onDeleteForm}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            aria-label="Delete form"
          >
            <Trash size={20} />
          </button>
          <button
            type="button"
            onClick={handleSharePDF}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            aria-label="Share as PDF"
          >
            <Share2 size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <label htmlFor="fond" className="block text-sm font-medium text-gray-700 mb-1">
            Fond
          </label>
          <div className="relative">
            <input
              type="text"
              id="fond"
              value={form.fond}
              onChange={(e) => onUpdateForm({ ...form, fond: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-invalid={!!errors.fond}
              aria-describedby={errors.fond ? "fond-error" : undefined}
            />
            <VoiceInputButton
              onVoiceInput={() => handleVoiceInputWithFeedback((value) => onUpdateForm({ ...form, fond: value }))}
              showButton={voiceLanguage !== 'none'}
              voiceLanguage={voiceLanguage}
            />
          </div>
          {errors.fond && <span id="fond-error" className="text-red-500 text-sm">{errors.fond}</span>}
        </div>

        <div className="relative">
          <label htmlFor="soldeALinstant" className="block text-sm font-medium text-gray-700 mb-1">
            Solde à l'instant
          </label>
          <div className="relative">
            <input
              type="text"
              id="soldeALinstant"
              value={form.soldeALinstant}
              onChange={(e) => onUpdateForm({ ...form, soldeALinstant: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-invalid={!!errors.soldeALinstant}
              aria-describedby={errors.soldeALinstant ? "soldeALinstant-error" : undefined}
            />
            <VoiceInputButton
              onVoiceInput={() => handleVoiceInputWithFeedback((value) => onUpdateForm({ ...form, soldeALinstant: value }))}
              showButton={voiceLanguage !== 'none'}
              voiceLanguage={voiceLanguage}
            />
          </div>
          {errors.soldeALinstant && <span id="soldeALinstant-error" className="text-red-500 text-sm">{errors.soldeALinstant}</span>}
        </div>

        <div className="relative">
          <label htmlFor="soldeDeDebut" className="block text-sm font-medium text-gray-700 mb-1">
            Solde de début
          </label>
          <div className="relative">
            <input
              type="text"
              id="soldeDeDebut"
              value={form.soldeDeDebut}
              onChange={(e) => onUpdateForm({ ...form, soldeDeDebut: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-invalid={!!errors.soldeDeDebut}
              aria-describedby={errors.soldeDeDebut ? "soldeDeDebut-error" : undefined}
            />
            <VoiceInputButton
              onVoiceInput={() => handleVoiceInputWithFeedback((value) => onUpdateForm({ ...form, soldeDeDebut: value }))}
              showButton={voiceLanguage !== 'none'}
              voiceLanguage={voiceLanguage}
            />
          </div>
          {errors.soldeDeDebut && <span id="soldeDeDebut-error" className="text-red-500 text-sm">{errors.soldeDeDebut}</span>}
        </div>
      </div>

      <div className="space-y-4">
        <CreditTable
          rows={form.creditRows}
          onAddRow={() => onUpdateForm({
            ...form,
            creditRows: [...form.creditRows, { totalClient: '', details: '', client: '' }]
          })}
          onRemoveRow={(index) => {
            if (form.creditRows.length > 1) {
              onUpdateForm({
                ...form,
                creditRows: form.creditRows.filter((_, i) => i !== index)
              })
            }
          }}
          onUpdateRow={(index, field, value) => {
            const newRows = [...form.creditRows]
            newRows[index] = { ...newRows[index], [field]: value }
            onUpdateForm({ ...form, creditRows: newRows })
          }}
          handleVoiceInputWithFeedback={handleVoiceInputWithFeedback}
          voiceLanguage={voiceLanguage}
        />

        <CreditPayeeTable
          rows={form.creditPayeeRows}
          onAddRow={() => onUpdateForm({
            ...form,
            creditPayeeRows: [...form.creditPayeeRows, { totalPayee: '', details: '', client: '' }]
          })}
          onRemoveRow={(index) => {
            if (form.creditPayeeRows.length > 1) {
              onUpdateForm({
                ...form,
                creditPayeeRows: form.creditPayeeRows.filter((_, i) => i !== index)
              })
            }
          }}
          onUpdateRow={(index, field, value) => {
            const newRows = [...form.creditPayeeRows]
            newRows[index] = { ...newRows[index], [field]: value }
            onUpdateForm({ ...form, creditPayeeRows: newRows })
          }}
          handleVoiceInputWithFeedback={handleVoiceInputWithFeedback}
          voiceLanguage={voiceLanguage}
        />

        <DepenseTable
          rows={form.depenseRows}
          onAddRow={() => onUpdateForm({
            ...form,
            depenseRows: [...form.depenseRows, { totalDepense: '', details: '', client: '' }]
          })}
          onRemoveRow={(index) => {
            if (form.depenseRows.length > 1) {
              onUpdateForm({
                ...form,
                depenseRows: form.depenseRows.filter((_, i) => i !== index)
              })
            }
          }}
          onUpdateRow={(index, field, value) => {
            const newRows = [...form.depenseRows]
            newRows[index] = { ...newRows[index], [field]: value }
            onUpdateForm({ ...form, depenseRows: newRows })
          }}
          handleVoiceInputWithFeedback={handleVoiceInputWithFeedback}
          voiceLanguage={voiceLanguage}
        />

        <RetraitTable
          rows={form.retraitRows}
          onAddRow={() => onUpdateForm({
            ...form,
            retraitRows: [...form.retraitRows, { retraitPayee: '', retrait: '', client: '' }]
          })}
          onRemoveRow={(index) => {
            if (form.retraitRows.length > 1) {
              onUpdateForm({
                ...form,
                retraitRows: form.retraitRows.filter((_, i) => i !== index)
              })
            }
          }}
          onUpdateRow={(index, field, value) => {
            const newRows = [...form.retraitRows]
            newRows[index] = { ...newRows[index], [field]: value }
            onUpdateForm({ ...form, retraitRows: newRows })
          }}
          handleVoiceInputWithFeedback={handleVoiceInputWithFeedback}
          voiceLanguage={voiceLanguage}
        />
      </div>

      <div className="flex items-center space-x-4">
        <label htmlFor="multiplier" className="block text-sm font-medium text-gray-700">
          Multiplier:
        </label>
        <select
          id="multiplier"
          value={form.multiplier}
          onChange={(e) => onUpdateForm({ ...form, multiplier: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
        >
          <option value="1.1">1.1</option>
          <option value="1.2">1.2</option>
          <option value="1.3">1.3</option>
        </select>
      </div>

      <div className="flex justify-between items-center">
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Calculate
        </button>
        {form.result && (
          <div className="text-xl font-bold">{form.result}</div>
        )}
      </div>
    </form>
  )
} 