'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { 
  Plus, ChevronRight, ChevronLeft, Trash2, RotateCcw, Clock, X, Book, Trash, Mic, Languages, Edit2, Check, 
  Palette, Share2, Camera, FileText // Add Camera and FileText icons
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import html2canvas from 'html2canvas' // Add this import
import { jsPDF } from 'jspdf' // Add this import

// Add at the top of the file, after imports
declare global {
  interface Window {
    webkitSpeechRecognition: any;
  }
}

// Add after the Window interface declaration
interface SpeechRecognitionEvent {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
}

// Types
type VoiceLanguage = 'none' | 'ar-SA' | 'fr-FR' | 'en-US'
type SiteColor = 'blue' | 'green' | 'yellow' | 'purple' | 'red' | 'none'
type ErrorKeys = 'fond' | 'soldeALinstant' | 'soldeDeDebut' | 'credit' | 'creditPayee' | 'depense' | 'retrait'
type Errors = Record<ErrorKeys, string>

// Add these interfaces at the top of the file, after the existing types
interface CreditRow {
  totalClient: string
  details: string
  client: string
}

interface CreditPayeeRow {
  totalPayee: string
  details: string
  client: string
}

interface DepenseRow {
  totalDepense: string
  details: string
  client: string
}

interface RetraitRow {
  retraitPayee: string
  retrait: string
  client: string
}

interface Form {
  id: string
  result: string
  timestamp: string
  creditRows: CreditRow[]
  creditPayeeRows: CreditPayeeRow[]
  depenseRows: DepenseRow[]
  retraitRows: RetraitRow[]
  fond: string
  soldeALinstant: string
  soldeDeDebut: string
  site: string
  multiplier: string
  calculationHistory?: Form[]
}

interface Site {
  id: string
  name: string
  color: SiteColor
  forms: Form[]
  statistics: {
    lastUpdated: string
  }
}

type RowField = {
  credit: keyof CreditRow
  creditPayee: keyof CreditPayeeRow
  depense: keyof DepenseRow
  retrait: keyof RetraitRow
}

// Add this constant for site colors
const SITE_COLORS: { [key in SiteColor]: { bg: string; hover: string; ring: string } } = {
  none: { bg: 'bg-white', hover: 'hover:bg-gray-50', ring: 'ring-gray-200' },
  blue: { bg: 'bg-blue-100', hover: 'hover:bg-blue-200', ring: 'ring-blue-300' },
  green: { bg: 'bg-green-100', hover: 'hover:bg-green-200', ring: 'ring-green-300' },
  yellow: { bg: 'bg-yellow-100', hover: 'hover:bg-yellow-200', ring: 'ring-yellow-300' },
  purple: { bg: 'bg-purple-100', hover: 'hover:bg-purple-200', ring: 'ring-purple-300' },
  red: { bg: 'bg-red-100', hover: 'hover:bg-red-200', ring: 'ring-red-300' }
}

// Helper Functions
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const readValue = () => {
    if (typeof window === 'undefined') {
      return initialValue
    }

    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error)
      return initialValue
    }
  }

  const [storedValue, setStoredValue] = useState<T>(readValue)

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error)
    }
  }

  return [storedValue, setValue]
} 

// Voice Processing Utility
const processVoiceInput = (transcript: string, isNumberField = true): string => {
  if (!isNumberField) {
    return transcript.trim()
  }

  const numberWords: { [key: string]: string } = {
    'zéro': '0', 'un': '1', 'deux': '2', 'trois': '3', 'quatre': '4',
    'cinq': '5', 'six': '6', 'sept': '7', 'huit': '8', 'neuf': '9',
    'dix': '10', 'onze': '11', 'douze': '12', 'treize': '13', 'quatorze': '14',
    'quinze': '15', 'seize': '16', 'vingt': '20', 'trente': '30',
    'quarante': '40', 'cinquante': '50', 'soixante': '60',
    'soixante-dix': '70', 'quatre-vingt': '80', 'quatre-vingt-dix': '90',
    'cent': '100', 'cents': '100', 'mille': '1000',
    'صفر': '0', 'واحد': '1', 'اثنين': '2', 'ثلاثة': '3', 'اربعة': '4',
    'خمسة': '5', 'ستة': '6', 'سبعة': '7', 'ثمانية': '8', 'تسعة': '9',
    'عشرة': '10', 'عشرين': '20', 'ثلاثين': '30', 'اربعين': '40',
    'خمسين': '50', 'ستين': '60', 'سبعين': '70', 'ثمانين': '80',
    'تسعين': '90', 'مية': '100', 'الف': '1000'
  }

  let processed = transcript.toLowerCase().trim()

  const corrections: { [key: string]: string } = {
    'virgule': '.', 'point': '.', 'plus': '+', 'et': '+', 'euro': '', 'euros': '',
    'zéros': 'zéro', 'OK': 'ok', 'فاصلة': '.', 'نقطة': '.', 'زائد': '+',
    'و': '+', 'دينار': '', 'دنانير': '', 'موافق': 'ok', 'عم': 'ok'
  }

  const arabicToEnglishNumbers: { [key: string]: string } = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
  }

  const matches = processed.match(/(\w+)\s+cents?/g)
  if (matches) {
    matches.forEach(match => {
      const [number] = match.split(/\s+/)
      if (numberWords[number]) {
        const value = parseInt(numberWords[number]) * 100
        processed = processed.replace(match, value.toString())
      }
    })
  }

  Object.entries(arabicToEnglishNumbers).forEach(([arabic, english]) => {
    processed = processed.replace(new RegExp(arabic, 'g'), english)
  })

  Object.entries(corrections).forEach(([key, value]) => {
    processed = processed.replace(new RegExp(key, 'g'), value)
  })

  Object.entries(numberWords).forEach(([word, digit]) => {
    processed = processed.replace(new RegExp(`\\b${word}\\b`, 'g'), digit)
  })

  processed = processed.replace(/(\d+)[.,](\d+)/g, '$1.$2')
  processed = processed.replace(/(\d+)\s*\+\s*(\d+)/g, '$1+$2')

  if (processed.includes('+')) {
    return processed
  }

  processed = processed.replace(/[^\d.+]/g, '')

  return processed
}

// FormPreview Component
interface FormPreviewProps {
  form: Form  // This is important
  onClose: () => void
  onRestore: () => void
  onNavigate: (direction: 'prev' | 'next') => void
  isFirstForm: boolean
  isLastForm: boolean
  siteColor: SiteColor
  removeRow: (tableType: 'credit' | 'creditPayee' | 'depense' | 'retrait', index: number) => void
  updateRow: (tableType: keyof RowField, index: number, field: RowField[typeof tableType], value: string) => void
  handleVoiceInputWithFeedback: (callback: (value: string) => void, isNumberField?: boolean) => void
  voiceLanguage: VoiceLanguage
  addRow: (tableType: 'credit' | 'creditPayee' | 'depense' | 'retrait') => void
}

// Add ShareData interface for Web Share API
interface ShareData {
  files?: File[];
  title?: string;
  text?: string;
}

// Add Navigator interface extension
interface Navigator {
  share?: (data: ShareData) => Promise<void>
  canShare?: (data: ShareData) => boolean
}

function FormPreview(props: FormPreviewProps) {
  // Destructure props at the beginning
  const { 
    form: formData, // Rename to formData to avoid conflicts
    onClose,
    onRestore,
    onNavigate,
    isFirstForm,
    isLastForm,
    siteColor,
    removeRow,
    updateRow,
    handleVoiceInputWithFeedback,
    voiceLanguage,
    addRow
  } = props;

  // Add missing state declarations
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewForm, setPreviewForm] = useState<Form | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number>(0);

  // Add proper typing for table rows
  const renderTableRows = (rows: (CreditRow | CreditPayeeRow | DepenseRow | RetraitRow)[], type: string) => {
    return rows.map((row, idx) => {
      switch(type) {
        case 'credit':
          const creditRow = row as CreditRow;
          return (
            <tr key={idx}>
              <td className="border border-gray-300 px-4 py-2">{creditRow.totalClient}</td>
              <td className="border border-gray-300 px-4 py-2">{creditRow.details}</td>
              <td className="border border-gray-300 px-4 py-2">{creditRow.client}</td>
            </tr>
          );
        case 'creditPayee':
          const creditPayeeRow = row as CreditPayeeRow;
          return (
            <tr key={idx}>
              <td className="border border-gray-300 px-4 py-2">{creditPayeeRow.totalPayee}</td>
              <td className="border border-gray-300 px-4 py-2">{creditPayeeRow.details}</td>
              <td className="border border-gray-300 px-4 py-2">{creditPayeeRow.client}</td>
            </tr>
          );
        case 'depense':
          const depenseRow = row as DepenseRow;
          return (
            <tr key={idx}>
              <td className="border border-gray-300 px-4 py-2">{depenseRow.totalDepense}</td>
              <td className="border border-gray-300 px-4 py-2">{depenseRow.details}</td>
              <td className="border border-gray-300 px-4 py-2">{depenseRow.client}</td>
            </tr>
          );
        case 'retrait':
          const retraitRow = row as RetraitRow;
          return (
            <tr key={idx}>
              <td className="border border-gray-300 px-4 py-2">{retraitRow.retraitPayee}</td>
              <td className="border border-gray-300 px-4 py-2">{retraitRow.retrait}</td>
              <td className="border border-gray-300 px-4 py-2">{retraitRow.client}</td>
            </tr>
          );
        default:
          return null;
      }
    });
  };

  // Inside FormPreview component, add these helper functions
  const formatValue = (value: string | number): string => {
    if (typeof value === 'string' && value.includes('+')) {
      return value.trim();
    }
    const num = parseFloat(String(value || '0'));
    return isNaN(num) ? '0' : num.toFixed(1);
  };

  // Move handleShare inside FormPreview component
  const handleShare = async () => {
    try {
      setIsProcessing(true);
      const summary = `
Generated via Calculator App made by T9a
${'-'.repeat(40)}

Date: ${new Date(formData.timestamp).toLocaleString()}
Final Result: ${formData.result}

BASIC INFORMATION
${'-'.repeat(40)}
Multiplier: ${formData.multiplier}
Fond: ${formatValue(formData.fond)}
Solde à l'instant: ${formData.soldeALinstant || '0'}
Solde de début: ${formatValue(formData.soldeDeDebut)}

CRÉDIT DETAILS
${'-'.repeat(40)}
${formData.creditRows.map((row, idx) => 
  `${idx + 1}. Client: ${row.client}
   Details: ${row.details}
   Total: ${formatValue(row.totalClient)}`
).join('\n')}

CRÉDIT PAYÉE DETAILS
${'-'.repeat(40)}
${formData.creditPayeeRows.map((row, idx) => 
  `${idx + 1}. Client: ${row.client}
   Details: ${row.details}
   Total: ${formatValue(row.totalPayee)}`
).join('\n')}

DÉPENSE DETAILS
${'-'.repeat(40)}
${formData.depenseRows.map((row, idx) => 
  `${idx + 1}. Client: ${row.client}
   Details: ${row.details}
   Total: ${formatValue(row.totalDepense)}`
).join('\n')}

RETRAIT DETAILS
${'-'.repeat(40)}
${formData.retraitRows.map((row, idx) => 
  `${idx + 1}. Retrait: ${formatValue(row.retrait)}
   Payée: ${row.retraitPayee}
   Client: ${row.client}`
).join('\n')}`.trim();

      console.log('Sharing text...'); // Debug log
      const encodedText = encodeURIComponent(summary);
      const whatsappUrl = `https://wa.me/?text=${encodedText}`;
      
      // Use setTimeout to ensure the URL opens
      setTimeout(() => {
        const newWindow = window.open(whatsappUrl, '_blank');
        if (!newWindow) {
          alert('Please allow pop-ups to share via WhatsApp');
        }
      }, 100);

    } catch (error) {
      console.error('Error sharing:', error);
      alert('Failed to share. Please try again.');
    } finally {
      setIsProcessing(false);
      setShowShareMenu(false);
    }
  };

  // Update handleShareAsImage function
  const handleShareAsImage = async () => {
    try {
      setIsProcessing(true);
      const formElement = document.querySelector('.form-preview-content');
      if (!formElement) {
        throw new Error('Form content not found');
      }

      // Show initial message
      alert('The image will be downloaded. After downloading, you can share it via WhatsApp.');

      const canvas = await html2canvas(formElement as HTMLElement, {
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'  // Changed to backgroundColor
      });

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) => 
        canvas.toBlob((blob) => resolve(blob!), 'image/png', 1.0)
      );

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = 'form-preview.png';
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);

      // Open WhatsApp with instructions
      const message = encodeURIComponent(
        'Form Preview Image\n' +
        '1. Click the attachment icon (📎)\n' +
        '2. Select "Document"\n' +
        '3. Choose the downloaded "form-preview.png" file'
      );
      
      const whatsappUrl = `https://wa.me/?text=${message}`;
      setTimeout(() => {
        const newWindow = window.open(whatsappUrl, '_blank');
        if (!newWindow) {
          alert('Please allow pop-ups to open WhatsApp');
        }
      }, 100);

    } catch (error) {
      console.error('Error sharing as image:', error);
      alert('Failed to create image. Please try again.');
    } finally {
      setIsProcessing(false);
      setShowShareMenu(false);
    }
  };

  // Update handleShareAsPDF function
  const handleShareAsPDF = async () => {
    try {
      setIsProcessing(true);
      // Show initial message
      alert('The PDF will be downloaded. After downloading, you can share it via WhatsApp.');

      const doc = new jsPDF();
      let yPos = 20;
      const leftMargin = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      const usableWidth = pageWidth - (leftMargin * 2);

      // Helper function for text wrapping
      const splitText = (text: string, fontSize: number) => {
        doc.setFontSize(fontSize);
        return doc.splitTextToSize(text, usableWidth - 10);
      };

      // Helper function to add text and return new Y position
      const addText = (text: string[], y: number, fontSize = 12) => {
        doc.setFontSize(fontSize);
        doc.text(text, leftMargin, y);
        return y + (fontSize * 0.3527) * text.length + 5;
      };

      // Add header
      doc.setFontSize(20);
      doc.setTextColor(0, 102, 204);
      doc.text('Form Preview', pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;

      // Add metadata
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      yPos = addText([
        `Date: ${new Date(formData.timestamp).toLocaleString()}`,
        `Result: ${formData.result}`
      ], yPos);
      yPos += 10;

      // Add separator line
      doc.setDrawColor(0, 102, 204);
      doc.setLineWidth(0.5);
      doc.line(leftMargin, yPos, pageWidth - leftMargin, yPos);
      yPos += 10;

      // Basic Information section
      doc.setFontSize(16);
      doc.setTextColor(0, 102, 204);
      doc.text('Basic Information', leftMargin, yPos);
      yPos += 10;

      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      yPos = addText([
        `Multiplier: ${formData.multiplier}`,
        `Fond: ${formatValue(formData.fond)}`,
        `Solde à l'instant: ${formData.soldeALinstant || '0'}`,
        `Solde de début: ${formatValue(formData.soldeDeDebut)}`
      ], yPos);
      yPos += 10;

      // Add separator
      doc.line(leftMargin, yPos, pageWidth - leftMargin, yPos);
      yPos += 10;

      // Credit section
      doc.setFontSize(16);
      doc.setTextColor(0, 102, 204);
      doc.text('Crédit Details', leftMargin, yPos);
      yPos += 10;

      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      formData.creditRows.forEach((row, idx) => {
        const details = splitText(row.details, 12);
        yPos = addText([
          `${idx + 1}. Client: ${row.client}`,
          `   Details: ${details[0]}`,
          ...(details.slice(1).map((line: string) => `           ${line}`)),
          `   Total: ${formatValue(row.totalClient)}`
        ], yPos);
        yPos += 5;
      });
      yPos += 5;

      // Check if we need a new page
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      // Credit Payee section
      doc.setFontSize(16);
      doc.setTextColor(0, 102, 204);
      doc.text('Crédit Payée Details', leftMargin, yPos);
      yPos += 10;

      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      formData.creditPayeeRows.forEach((row, idx) => {
        const details = splitText(row.details, 12);
        yPos = addText([
          `${idx + 1}. Client: ${row.client}`,
          `   Details: ${details[0]}`,
          ...(details.slice(1).map((line: string) => `           ${line}`)),
          `   Total: ${formatValue(row.totalPayee)}`
        ], yPos);
        yPos += 5;
      });
      yPos += 5;

      // Check for new page
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      // Add totals section
      doc.setFontSize(16);
      doc.setTextColor(0, 102, 204);
      doc.text('Final Totals', leftMargin, yPos);
      yPos += 10;

      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      yPos = addText([
        `Credit: ${formatValue(formData.creditRows.reduce((sum, row) => sum + parseFloat(row.totalClient || '0'), 0))}`,
        `Credit Payée: ${formatValue(formData.creditPayeeRows.reduce((sum, row) => sum + parseFloat(row.totalPayee || '0'), 0))}`,
        `Depense: ${formatValue(formData.depenseRows.reduce((sum, row) => sum + parseFloat(row.totalDepense || '0'), 0))}`,
        `Retrait: ${formatValue(formData.retraitRows.reduce((sum, row) => sum + parseFloat(row.retrait || '0'), 0))}`
      ], yPos);

      // Add footer
      doc.setFontSize(10);
      doc.setTextColor(128, 128, 128);
      doc.text('Generated via Calculator App', pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });

      // Save PDF
      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.download = 'form-preview.pdf';
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);

      // Open WhatsApp with instructions
      const message = encodeURIComponent(
        'Form Preview PDF\n' +
        '1. Click the attachment icon (📎)\n' +
        '2. Select "Document"\n' +
        '3. Choose the downloaded "form-preview.pdf" file'
      );
      
      const whatsappUrl = `https://wa.me/?text=${message}`;
      setTimeout(() => {
        const newWindow = window.open(whatsappUrl, '_blank');
        if (!newWindow) {
          alert('Please allow pop-ups to open WhatsApp');
        }
      }, 100);

    } catch (error) {
      console.error('Error sharing as PDF:', error);
      alert('Failed to create PDF. Please try again.');
    } finally {
      setIsProcessing(false);
      setShowShareMenu(false);
    }
  };

  // Add click outside handler to close the dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showShareMenu && !(event.target as Element).closest('.share-dropdown')) {
        setShowShareMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showShareMenu]);

  // Update handleFormClick function
  const handleFormClick = (selectedForm: Form, index: number) => {
    setPreviewForm(selectedForm);
    setPreviewIndex(index);
  };

  // Update handleNavigate function
  const handleNavigate = (direction: 'prev' | 'next') => {
    const currentPosition = previewIndex;
    const newPosition = direction === 'prev' ? currentPosition - 1 : currentPosition + 1;
    
    if (newPosition >= 0 && formData.calculationHistory && newPosition < formData.calculationHistory.length) {
      const entry = formData.calculationHistory[newPosition];
      setPreviewIndex(newPosition);
      setPreviewForm(entry);
    }
  };

  // Inside FormPreview component, add loading indicator component
  const LoadingSpinner = () => (
    <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-white" />
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`${SITE_COLORS[siteColor].bg} rounded-lg shadow-xl p-6 w-[95%] max-w-5xl max-h-[90vh] overflow-y-auto relative`}>
        {/* Navigation buttons */}
        <div className="fixed top-1/2 left-4 right-4 -translate-y-1/2 flex justify-between z-[60] pointer-events-none">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onNavigate('prev')
            }}
            disabled={isFirstForm}
            className={`p-3 rounded-full bg-white shadow-lg transform transition-all duration-200 pointer-events-auto
              ${isFirstForm ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 hover:scale-110'}`}
          >
            <ChevronLeft size={24} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onNavigate('next')
            }}
            disabled={isLastForm}
            className={`p-3 rounded-full bg-white shadow-lg transform transition-all duration-200 pointer-events-auto
              ${isLastForm ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 hover:scale-110'}`}
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {/* Header */}
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <div>
            <h2 className="text-2xl font-bold">Form Preview</h2>
            <div className="flex items-center text-gray-500 mt-2">
              <Clock size={16} className="mr-2" />
              <span>{formatDistanceToNow(new Date(formData.timestamp), { addSuffix: true })}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Replace the single share button with dropdown */}
            <div className="relative share-dropdown">
              <button
                onClick={() => setShowShareMenu(!showShareMenu)}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-2"
                title="Share options"
              >
                <Share2 size={16} />
                Share
              </button>
              
              {showShareMenu && (
                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                  <div className="py-1" role="menu">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleShare();
                      }}
                      disabled={isProcessing}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      role="menuitem"
                    >
                      {isProcessing ? <LoadingSpinner /> : <Share2 size={16} />}
                      Share as Text
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleShareAsImage();
                      }}
                      disabled={isProcessing}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      role="menuitem"
                    >
                      <Camera size={16} />
                      Share as Image
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleShareAsPDF();
                      }}
                      disabled={isProcessing}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      role="menuitem"
                    >
                      <FileText size={16} />
                      Share as PDF
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                onRestore();
                onClose();
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2"
            >
              <RotateCcw size={16} />
              Restore
            </button>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Form Content */}
        <div className="form-preview-content space-y-6">
          {/* Basic Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3 bg-white rounded-lg">
              <label className="text-sm text-gray-500 block">Multiplier</label>
              <p className="font-medium text-lg">{formData.multiplier}</p>
            </div>
            <div className="p-3 bg-white rounded-lg">
              <label className="text-sm text-gray-500 block">Fond</label>
              <p className="font-medium text-lg">{formData.fond || '0'}</p>
            </div>
            <div className="p-3 bg-white rounded-lg">
              <label className="text-sm text-gray-500 block">Solde à l'instant</label>
              <p className="font-medium text-lg">{formData.soldeALinstant || '0'}</p>
            </div>
            <div className="p-3 bg-white rounded-lg">
              <label className="text-sm text-gray-500 block">Solde de début</label>
              <p className="font-medium text-lg">{formData.soldeDeDebut || '0'}</p>
            </div>
          </div>

          {/* Tables */}
          <div className="space-y-8">
            {/* Credit Table */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Crédit</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="border border-gray-300 px-4 py-2">Total Client</th>
                      <th className="border border-gray-300 px-4 py-2">Détailles</th>
                      <th className="border border-gray-300 px-4 py-2">Client</th>
                    </tr>
                  </thead>
                  <tbody>
                    {renderTableRows(formData.creditRows, 'credit')}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Credit Payee Table */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Crédit Payée</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="border border-gray-300 px-4 py-2">Total Payée</th>
                      <th className="border border-gray-300 px-4 py-2">Détailles</th>
                      <th className="border border-gray-300 px-4 py-2">Client</th>
                    </tr>
                  </thead>
                  <tbody>
                    {renderTableRows(formData.creditPayeeRows, 'creditPayee')}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Depense Table */}
            <div>
              <div className="flex items-center mb-4">
                <h3 className="text-xl font-semibold flex-1 text-center">Dépense</h3>
                <button
                  type="button"
                  onClick={() => addRow('depense')}
                  className="p-1 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                >
                  <Plus size={20} />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <colgroup>
                    <col className="w-[40px]" />
                    <col className="w-[50px] sm:w-[70px]" />
                    <col />
                    <col className="w-[90px] sm:w-[110px]" />
                  </colgroup>
                  <tbody>
                    {formData.depenseRows.map((row: DepenseRow, index: number) => (
                      <tr key={index}>
                        <td className="p-2">
                          <button
                            type="button"
                            onClick={() => removeRow('depense', index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.totalDepense}
                            readOnly
                            className="w-full bg-gray-50 text-right font-mono px-2 py-1 rounded"
                            maxLength={4}
                          />
                        </td>
                        <td className="p-2 border-l border-r border-gray-200">
                          <div className="relative w-full">
                            <textarea
                              value={row.details}
                              placeholder="Détails"
                              onChange={(e) => updateRow('depense', index, 'details', e.target.value)}
                              className="w-full min-h-[38px] resize-none overflow-hidden px-2 py-1 rounded whitespace-normal break-words font-mono text-base leading-relaxed text-right"
                              rows={1}
                              onInput={(e) => {
                                e.currentTarget.style.height = 'auto'
                                const newHeight = Math.max(38, e.currentTarget.scrollHeight)
                                e.currentTarget.style.height = `${newHeight}px`
                              }}
                            />
                            <VoiceInputButton 
                              onVoiceInput={() => handleVoiceInputWithFeedback(
                                (value) => updateRow('depense', index, 'details', value)
                              )}
                              showButton={voiceLanguage !== 'none'}
                              voiceLanguage={voiceLanguage}
                            />
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="relative">
                            <textarea
                              value={row.client}
                              placeholder="Client"
                              onChange={(e) => updateRow('depense', index, 'client', e.target.value)}
                              className="w-full min-h-[38px] resize-none overflow-hidden px-1 py-1 rounded whitespace-normal break-words font-mono text-base leading-relaxed text-right"
                              rows={1}
                              onInput={(e) => {
                                e.currentTarget.style.height = 'auto'
                                const newHeight = Math.max(38, e.currentTarget.scrollHeight)
                                e.currentTarget.style.height = `${newHeight}px`
                              }}
                            />
                            <VoiceInputButton 
                              onVoiceInput={() => handleVoiceInputWithFeedback(
                                (value) => updateRow('depense', index, 'client', value),
                                false
                              )}
                              showButton={voiceLanguage !== 'none'}
                              voiceLanguage={voiceLanguage}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Retrait Table */}
            <div>
              <div className="flex items-center mb-4">
                <h3 className="text-xl font-semibold flex-1 text-center">Retrait</h3>
                <button
                  type="button"
                  onClick={() => addRow('retrait')}
                  className="p-1 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                >
                  <Plus size={20} />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <colgroup>
                    <col className="w-[40px]" />
                    <col className="w-[50px] sm:w-[70px]" />
                    <col className="w-[50px] sm:w-[70px]" />
                    <col className="w-[90px] sm:w-[110px]" />
                  </colgroup>
                  <tbody>
                    {formData.retraitRows.map((row: RetraitRow, index: number) => (
                      <tr key={index}>
                        <td className="p-2">
                          <button
                            type="button"
                            onClick={() => removeRow('retrait', index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.retraitPayee}
                            onChange={(e) => updateRow('retrait', index, 'retraitPayee', e.target.value)}
                            className="w-full bg-gray-50 text-right font-mono px-2 py-1 rounded"
                          />
                        </td>
                        <td className="p-2 border-l border-r border-gray-200">
                          <div className="relative w-full">
                            <textarea
                              value={row.retrait}
                              onChange={(e) => {
                                const value = e.target.value
                                if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                  updateRow('retrait', index, 'retrait', value)
                                }
                              }}
                              className="w-full min-h-[38px] resize-none overflow-hidden px-2 py-1 rounded whitespace-normal break-words font-mono text-base leading-relaxed text-right"
                              rows={1}
                              onInput={(e) => {
                                e.currentTarget.style.height = 'auto'
                                const newHeight = Math.max(38, e.currentTarget.scrollHeight)
                                e.currentTarget.style.height = `${newHeight}px`
                              }}
                            />
                            <VoiceInputButton 
                              onVoiceInput={() => handleVoiceInputWithFeedback(
                                (value) => updateRow('retrait', index, 'retrait', value)
                              )}
                              showButton={voiceLanguage !== 'none'}
                              voiceLanguage={voiceLanguage}
                            />
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="relative">
                            <textarea
                              value={row.client}
                              placeholder="Client"
                              onChange={(e) => updateRow('retrait', index, 'client', e.target.value)}
                              className="w-full min-h-[38px] resize-none overflow-hidden px-1 py-1 rounded whitespace-normal break-words font-mono text-base leading-relaxed text-right"
                              rows={1}
                              onInput={(e) => {
                                e.currentTarget.style.height = 'auto'
                                const newHeight = Math.max(38, e.currentTarget.scrollHeight)
                                e.currentTarget.style.height = `${newHeight}px`
                              }}
                            />
                            <VoiceInputButton 
                              onVoiceInput={() => handleVoiceInputWithFeedback(
                                (value) => updateRow('retrait', index, 'client', value),
                                false
                              )}
                              showButton={voiceLanguage !== 'none'}
                              voiceLanguage={voiceLanguage}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Result */}
          <div className="mt-8 text-center p-4 bg-white rounded-lg">
            <h2 className="text-xl font-bold mb-2">Result</h2>
            <p className="text-3xl font-bold text-blue-600">{formData.result}</p>
          </div>
        </div>
      </div>
    </div>
  )
} 

// HistorySlider Component
interface HistorySliderProps {
  forms: Form[]
  currentFormIndex: number
  onFormSelect: (index: number, historicalForm?: Form) => void
  siteColor: SiteColor
  removeRow: (tableType: 'credit' | 'creditPayee' | 'depense' | 'retrait', index: number) => void
  updateRow: (tableType: keyof RowField, index: number, field: RowField[typeof tableType], value: string) => void
  handleVoiceInputWithFeedback: (callback: (value: string) => void, isNumberField?: boolean) => void
  voiceLanguage: VoiceLanguage
  addRow: (tableType: 'credit' | 'creditPayee' | 'depense' | 'retrait') => void
}

function HistorySlider({ 
  forms, 
  currentFormIndex, 
  onFormSelect, 
  siteColor,
  removeRow,
  updateRow,
  handleVoiceInputWithFeedback,
  voiceLanguage,
  addRow
}: HistorySliderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [previewForm, setPreviewForm] = useState<Form | null>(null)
  const [previewIndex, setPreviewIndex] = useState<number>(0)
  const sliderRef = useRef<HTMLDivElement>(null)

  // Get current form and its history
  const currentForm = forms[currentFormIndex]
  const calculationHistory = currentForm.calculationHistory || []
  
  // Filter history entries with results
  const historyWithResults = calculationHistory.filter(entry => 
    entry.result && entry.result !== 'Total: 0.0'
  )

  const handleFormClick = (form: Form, index: number) => {
    setPreviewForm(form)
    setPreviewIndex(index)
  }

  const handleNavigate = (direction: 'prev' | 'next') => {
    const currentPosition = previewIndex
    const newPosition = direction === 'prev' ? currentPosition - 1 : currentPosition + 1
    
    if (newPosition >= 0 && newPosition < historyWithResults.length) {
      const entry = historyWithResults[newPosition]
      setPreviewIndex(newPosition)
      setPreviewForm(entry)
    }
  }

  const handleRestore = (form: Form) => {
    onFormSelect(currentFormIndex, form)
  }

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-10 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div className={`fixed bottom-0 left-0 right-0 ${SITE_COLORS[siteColor].bg} border-t border-gray-200 p-4 z-40`}>
        {!isOpen ? (
          <div className="absolute left-1/2 -translate-x-1/2 -top-5">
            <button
              onClick={() => setIsOpen(true)}
              className="flex items-center justify-center w-10 h-10 bg-white rounded-full hover:bg-gray-100 transition-all duration-200 border border-gray-200 shadow-lg"
            >
              <Book size={20} className="text-gray-600" />
            </button>
          </div>
        ) : (
          <div ref={sliderRef} className="pt-2">
            {/* History timeline UI */}
            <div className="relative">
              <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-gray-300 -translate-y-1/2" />
              <div className="flex items-center justify-start space-x-8 overflow-x-auto pb-4 px-4">
                {historyWithResults.map((entry, index) => (
                  <button
                    key={entry.timestamp}
                    onClick={() => handleFormClick(entry, index)}
                    className="flex flex-col items-center min-w-[60px] group relative"
                  >
                    <div 
                      className={`w-6 h-6 rounded-full flex-shrink-0 mb-2 transition-all duration-200 
                        ${index === previewIndex
                          ? 'bg-blue-500 ring-4 ring-blue-200' 
                          : 'bg-gray-300 group-hover:bg-gray-400 group-hover:scale-110'
                        }`}
                      title={`Calculation ${index + 1} - ${entry.result}`}
                    />
                    <span className="text-xs text-gray-500 whitespace-nowrap opacity-80 group-hover:opacity-100">
                      {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {previewForm && (
          <FormPreview 
            form={previewForm}
            onClose={() => setPreviewForm(null)}
            onRestore={() => handleRestore(previewForm)}
            onNavigate={handleNavigate}
            isFirstForm={previewIndex === 0}
            isLastForm={previewIndex === historyWithResults.length - 1}
            siteColor={siteColor}
            removeRow={removeRow}
            updateRow={updateRow}
            handleVoiceInputWithFeedback={handleVoiceInputWithFeedback}
            voiceLanguage={voiceLanguage}
            addRow={addRow}
          />
        )}
      </div>
    </>
  )
} 

// Add SiteCarousel component interface
interface SiteCarouselProps {
  sites: Site[]
  currentSiteIndex: number
  onSiteChange: (index: number) => void
  onAddSite: () => void
  onUpdateSite: (siteIndex: number, updatedSite: Site) => void
  onDeleteSite: (siteIndex: number) => void
}

// Add SiteCard component interface
interface SiteCardProps {
  site: Site
  isDefault?: boolean
  onSelect: (siteId: string) => void
  onUpdateSite: (updatedSite: Site) => void
  onDeleteSite: () => void
}

// Add SiteCard component
function SiteCard({ 
  site, 
  isDefault = false, 
  onSelect, 
  onUpdateSite,
  onDeleteSite 
}: SiteCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedName, setEditedName] = useState(site.name)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    setEditedName(site.name)
  }, [site.name])

  return (
    <div 
      className={`
        relative flex-shrink-0 w-[280px] p-4 rounded-lg shadow-lg
        transition-all duration-300 hover:shadow-xl cursor-pointer
        ${SITE_COLORS[site.color || 'none'].bg}
      `}
    >
      <div className="flex justify-between items-start mb-4">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              className="px-2 py-1 border rounded"
              autoFocus
            />
            <button onClick={() => {
              if (editedName.trim()) {
                onUpdateSite({ ...site, name: editedName.trim() })
                setIsEditing(false)
              }
            }} className="text-green-500 hover:text-green-700">
              <Check size={20} />
            </button>
            <button onClick={() => {
              setEditedName(site.name)
              setIsEditing(false)
            }} className="text-red-500 hover:text-red-700">
              <X size={20} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold">{site.name}</h3>
            <button 
              onClick={(e) => {
                e.stopPropagation()
                setIsEditing(true)
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <Edit2 size={16} />
            </button>
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowColorPicker(!showColorPicker)
                }}
                className="text-gray-400 hover:text-gray-600 ml-2"
              >
                <Palette size={16} />
              </button>
              
              {showColorPicker && (
                <div className="absolute top-full left-0 mt-2 p-2 bg-white rounded-lg shadow-lg z-50 flex gap-2">
                  {Object.entries(SITE_COLORS).map(([color, styles]) => (
                    <button
                      key={color}
                      onClick={(e) => {
                        e.stopPropagation()
                        onUpdateSite({ ...site, color: color as SiteColor })
                        setShowColorPicker(false)
                      }}
                      className={`w-8 h-8 rounded-full ${styles.bg} ${styles.hover} border-2 border-gray-200 transition-all duration-200 transform hover:scale-110
                        ${site.color === color ? 'ring-2 ring-offset-2 ' + styles.ring : ''}
                      `}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        
        {!isDefault && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowDeleteConfirm(true)
            }}
            className="text-red-400 hover:text-red-600 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <div 
        onClick={() => onSelect(site.id)}
        className="space-y-2"
      >
        <p>Forms: {site.forms.length}</p>
        <p className="font-semibold">
          Total: {site.forms.reduce((total, form) => {
            const result = parseFloat(form.result.replace('Total: ', '')) || 0
            return total + result
          }, 0).toFixed(1)}
        </p>
        <p className="text-sm text-gray-500">
          Updated {formatDistanceToNow(new Date(site.statistics.lastUpdated), { addSuffix: true })}
        </p>
      </div>

      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center rounded-lg p-4">
          <p className="text-center mb-4">Are you sure you want to delete this site?</p>
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDeleteSite()
                setShowDeleteConfirm(false)
              }}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Delete
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowDeleteConfirm(false)
              }}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Add SiteCarousel component
function SiteCarousel({ 
  sites, 
  currentSiteIndex, 
  onSiteChange, 
  onAddSite,
  onUpdateSite,
  onDeleteSite
}: SiteCarouselProps) {
  const carouselRef = useRef<HTMLDivElement>(null)

  const handleAddSite = () => {
    onAddSite()
    setTimeout(() => {
      if (carouselRef.current) {
        carouselRef.current.scrollTo({
          left: carouselRef.current.scrollWidth,
          behavior: 'smooth'
        })
      }
    }, 100)
  }

  // Calculate total sites result
  const totalSitesResult = sites.reduce((total: number, site) => {
    return total + site.forms.reduce((formTotal: number, form) => {
      const result = parseFloat(form.result.replace('Total: ', '')) || 0
      return formTotal + result
    }, 0)
  }, 0).toFixed(1)

  return (
    <div className="relative w-full overflow-hidden mb-8">
      <div 
        ref={carouselRef}
        className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth"
      >
        {sites.map((site, index) => (
          <div key={site.id} className="snap-start">
            <SiteCard
              site={site}
              isDefault={index === 0}
              onSelect={() => onSiteChange(index)}
              onUpdateSite={(updatedSite) => onUpdateSite(index, updatedSite)}
              onDeleteSite={() => onDeleteSite(index)}
            />
          </div>
        ))}
        <div className="snap-start">
          <button
            onClick={handleAddSite}
            className="flex-shrink-0 w-[280px] h-[200px] bg-white rounded-lg shadow-lg hover:shadow-xl transition-all flex flex-col items-center justify-center gap-4"
          >
            <div className="text-lg font-semibold text-gray-600">
              Total Sites: {totalSitesResult}
            </div>
            <Plus size={24} className="text-gray-400" />
            <span className="text-gray-600">Add New Site</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// Add LanguageSelector component
function LanguageSelector({ 
  selectedLanguage, 
  onLanguageChange 
}: { 
  selectedLanguage: VoiceLanguage
  onLanguageChange: (lang: VoiceLanguage) => void 
}) {
  const [isOpen, setIsOpen] = useState(false)
  const LANGUAGE_OPTIONS = [
    { code: 'none' as VoiceLanguage, label: 'No Voice Input', flag: '🔇' },
    { code: 'ar-SA' as VoiceLanguage, label: 'الربية', flag: '🇸🇦' },
    { code: 'fr-FR' as VoiceLanguage, label: 'Français', flag: '🇫🇷' },
    { code: 'en-US' as VoiceLanguage, label: 'English', flag: '🇺🇸' }
  ]

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
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50">
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

// Add VoiceInputButton component
function VoiceInputButton({ 
  onVoiceInput,
  showButton,
  voiceLanguage
}: { 
  onVoiceInput: () => void
  showButton: boolean
  voiceLanguage: VoiceLanguage
}) {
  if (!showButton || voiceLanguage === 'none') return null

  return (
    <button
      type="button"
      onClick={onVoiceInput}
      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
      title="Click to use voice input"
    >
      <Mic size={20} />
    </button>
  )
}

// Add VoiceFeedback component
function VoiceFeedback({ 
  isListening, 
  language 
}: { 
  isListening: boolean
  language: VoiceLanguage 
}) {
  if (!isListening) return null

  const messages = {
    'none': {
      listening: 'Listening...',
      speak: 'Please speak clearly'
    },
    'ar-SA': {
      listening: 'جاري الاستماع...',
      speak: 'تحدث بوضوح من فضلك'
    },
    'fr-FR': {
      listening: 'Écoute en cours...',
      speak: 'Parlez clairement s\'il vous plaît'
    },
    'en-US': {
      listening: 'Listening...',
      speak: 'Please speak clearly'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl">
        <p className="text-lg mb-3">{messages[language].listening}</p>
        <p className="text-sm text-gray-600 mb-3">
          {messages[language].speak}
        </p>
        <div className="flex items-center justify-center space-x-2">
          <div className="animate-pulse w-3 h-3 bg-red-500 rounded-full" />
          <div className="animate-pulse w-3 h-3 bg-red-500 rounded-full delay-75" />
          <div className="animate-pulse w-3 h-3 bg-red-500 rounded-full delay-150" />
        </div>
      </div>
    </div>
  )
}

// Add this type for the speech recognition event
interface SpeechRecognitionEvent {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
}

// Main Calculator Component
export function Calculator() {
  // State declarations
  const [mounted, setMounted] = useState(false)
  const [voiceLanguage, setVoiceLanguage] = useState<VoiceLanguage>('none')
  const [multiplier, setMultiplier] = useState('1.1')
  const [fond, setFond] = useState('')
  const [soldeALinstant, setSoldeALinstant] = useState('')
  const [site, setSite] = useState('')
  const [soldeDeDebut, setSoldeDeDebut] = useState('')
  const [creditRows, setCreditRows] = useState<CreditRow[]>([{ totalClient: '', details: '', client: '' }])
  const [creditPayeeRows, setCreditPayeeRows] = useState<CreditPayeeRow[]>([{ totalPayee: '', details: '', client: '' }])
  const [depenseRows, setDepenseRows] = useState<DepenseRow[]>([{ totalDepense: '', details: '', client: '' }])
  const [retraitRows, setRetraitRows] = useState<RetraitRow[]>([{ retraitPayee: '', retrait: '', client: '' }])
  const [result, setResult] = useState('')
  const [errors, setErrors] = useState<Errors>({
    fond: '',
    soldeALinstant: '',
    soldeDeDebut: '',
    credit: '',
    creditPayee: '',
    depense: '',
    retrait: ''
  })

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

  // Add useEffect for initialization
  useEffect(() => {
    setMounted(true)
    if (sites[currentSiteIndex]) {
      setSite(sites[currentSiteIndex].name)
    }
  }, [sites, currentSiteIndex])

  // Helper functions
  const validateInput = (value: string, errorKey: ErrorKeys, isMandatory = false) => {
    let parsedValue: number | null = null
    const newErrors = { ...errors }

    if (errorKey === 'soldeALinstant' || errorKey === 'soldeDeDebut') {
      const numbers = value.split('+').map(num => parseFloat(num.trim())).filter(num => !isNaN(num))
      parsedValue = numbers.reduce((acc, num) => acc + num, 0)
    } else {
      parsedValue = parseFloat(value)
    }

    if (value === '' && !isMandatory) {
      newErrors[errorKey] = ''
      setErrors(newErrors)
      return 0
    } else if (isMandatory && (value === '' || parsedValue === 0 || isNaN(parsedValue))) {
      newErrors[errorKey] = 'svp insérer un solde de début'
      setErrors(newErrors)
      return null
    } else if (isNaN(parsedValue)) {
      newErrors[errorKey] = 'Please enter a valid number'
      setErrors(newErrors)
      return null
    }

    newErrors[errorKey] = ''
    setErrors(newErrors)
    return parsedValue
  }

  // Handler functions
  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault()
    const validatedSoldeALinstant = validateInput(soldeALinstant, 'soldeALinstant') || 0
    const validatedFond = validateInput(fond, 'fond') || 0
    const validatedSoldeDeDebut = validateInput(soldeDeDebut, 'soldeDeDebut', true)

    if (validatedSoldeDeDebut === null) return

    const totalRetrait = retraitRows.reduce((total: number, row: RetraitRow) => 
      total + parseFloat(row.retrait || '0'), 0)
    const totalRetraitPayee = retraitRows.reduce((total: number, row: RetraitRow) => {
      if (row.retraitPayee === 'OK') {
        return total + parseFloat(row.retrait || '0')
      }
      return total + parseFloat(row.retraitPayee || '0')
    }, 0)

    const totalCredit = creditRows.reduce((total: number, row: CreditRow) => 
      total + parseFloat(row.totalClient || '0'), 0)
    const totalCreditPayee = creditPayeeRows.reduce((total: number, row: CreditPayeeRow) => 
      total + parseFloat(row.totalPayee || '0'), 0)

    const totalDepense = depenseRows.reduce((total: number, row: DepenseRow) => 
      total + parseFloat(row.totalDepense || '0'), 0)
    const selectedMultiplier = parseFloat(multiplier)

    const total = ((validatedSoldeDeDebut + totalRetrait) - validatedSoldeALinstant) * selectedMultiplier - totalRetraitPayee - totalDepense - totalCredit + totalCreditPayee + validatedFond

    const newResult = `Total: ${total.toFixed(1)}`
    setResult(newResult)

    // Create history entry
    const historyEntry: Form = {
      id: sites[currentSiteIndex].forms[currentFormIndex].id,
      result: newResult,
      timestamp: new Date().toISOString(),
      creditRows: creditRows.map(row => ({...row})),
      creditPayeeRows: creditPayeeRows.map(row => ({...row})),
      depenseRows: depenseRows.map(row => ({...row})),
      retraitRows: retraitRows.map(row => ({...row})),
      fond,
      soldeALinstant,
      soldeDeDebut,
      site: sites[currentSiteIndex].name,
      multiplier,
      calculationHistory: []
    }

    // Update forms
    const updatedForms = [...sites[currentSiteIndex].forms]
    updatedForms[currentFormIndex] = {
      ...updatedForms[currentFormIndex],
      result: newResult,
      calculationHistory: [
        ...(updatedForms[currentFormIndex].calculationHistory || []),
        historyEntry
      ]
    }

    const updatedSite = {
      ...sites[currentSiteIndex],
      forms: updatedForms,
      statistics: {
        ...sites[currentSiteIndex].statistics,
        lastUpdated: new Date().toISOString()
      }
    }

    handleUpdateSite(currentSiteIndex, updatedSite)
  }

  // Add handleReset function
  const handleReset = () => {
    setMultiplier('1.1')
    setFond('')
    setSoldeALinstant('')
    setSite('')
    setSoldeDeDebut('')
    setCreditRows([{ totalClient: '', details: '', client: '' }])
    setCreditPayeeRows([{ totalPayee: '', details: '', client: '' }])
    setDepenseRows([{ totalDepense: '', details: '', client: '' }])
    setRetraitRows([{ retraitPayee: '', retrait: '', client: '' }])
    setResult('')
    setErrors({
      fond: '',
      soldeALinstant: '',
      soldeDeDebut: '',
      credit: '',
      creditPayee: '',
      depense: '',
      retrait: ''
    })
  }

  // Add handleUpdateSite function
  const handleUpdateSite = (siteIndex: number, updatedSite: Site) => {
    const newSites = [...sites]
    newSites[siteIndex] = updatedSite
    setSites(newSites)
    
    // Update the site name in the form if it's the current site
    if (siteIndex === currentSiteIndex) {
      setSite(updatedSite.name)
    }
  }

  // Add handleDeleteForm function
  const handleDeleteForm = () => {
    const currentForms = sites[currentSiteIndex].forms
    
    // If it's the last form, show confirmation dialog
    if (currentForms.length === 1) {
      if (confirm("This is the last form. Are you sure you want to delete it?")) {
        // Create a new empty form
        const newForm: Form = {
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
        }
        
        const updatedSite = {
          ...sites[currentSiteIndex],
          forms: [newForm]
        }
        
        handleUpdateSite(currentSiteIndex, updatedSite)
        setCurrentFormIndex(0)
        handleReset()
      }
      return
    }

    // For other forms, proceed with deletion
    const updatedForms = currentForms.filter((_: Form, i: number) => i !== currentFormIndex)
    const updatedSite = {
      ...sites[currentSiteIndex],
      forms: updatedForms
    }
    
    handleUpdateSite(currentSiteIndex, updatedSite)
    setCurrentFormIndex(Math.max(0, currentFormIndex - 1))
    loadForm(updatedForms[Math.max(0, currentFormIndex - 1)])
  }

  // Add loadForm function
  const loadForm = (form: Form) => {
    if (!form) return
    setMultiplier(form.multiplier)
    setFond(form.fond)
    setSoldeALinstant(form.soldeALinstant)
    setSite(form.site)
    setSoldeDeDebut(form.soldeDeDebut)
    setCreditRows(form.creditRows.map(row => ({...row})))
    setCreditPayeeRows(form.creditPayeeRows.map(row => ({...row})))
    setDepenseRows(form.depenseRows.map(row => ({...row})))
    setRetraitRows(form.retraitRows.map(row => ({...row})))
    setResult(form.result)
  }

  // Add voice input handling functions
  const handleVoiceInput = useCallback((
    callback: (value: string) => void,
    isNumberField: boolean = true
  ) => {
    if (!window.webkitSpeechRecognition) {
      alert('Speech recognition is not supported in this browser')
      return
    }

    const recognition = new (window.webkitSpeechRecognition)()
    recognition.lang = voiceLanguage
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript
      const processed = processVoiceInput(transcript, isNumberField)
      callback(processed)
    }

    recognition.start()
  }, [voiceLanguage])

  const handleVoiceInputWithFeedback = useCallback((
    callback: (value: string) => void,
    isNumberField: boolean = true
  ) => {
    if (voiceLanguage === 'none') {
      alert('Please select a voice input language first')
      return
    }
    handleVoiceInput(callback, isNumberField)
  }, [handleVoiceInput, voiceLanguage])

  // Add row handling functions
  const addRow = (tableType: 'credit' | 'creditPayee' | 'depense' | 'retrait') => {
    switch (tableType) {
      case 'credit':
        setCreditRows([...creditRows, { totalClient: '', details: '', client: '' }])
        break
      case 'creditPayee':
        setCreditPayeeRows([...creditPayeeRows, { totalPayee: '', details: '', client: '' }])
        break
      case 'depense':
        setDepenseRows([...depenseRows, { totalDepense: '', details: '', client: '' }])
        break
      case 'retrait':
        setRetraitRows([...retraitRows, { retraitPayee: '', retrait: '', client: '' }])
        break
    }
  }

  const removeRow = (tableType: 'credit' | 'creditPayee' | 'depense' | 'retrait', index: number) => {
    switch (tableType) {
      case 'credit':
        if (creditRows.length > 1) {
          setCreditRows(creditRows.filter((_, i) => i !== index))
        }
        break
      case 'creditPayee':
        if (creditPayeeRows.length > 1) {
          setCreditPayeeRows(creditPayeeRows.filter((_, i) => i !== index))
        }
        break
      case 'depense':
        if (depenseRows.length > 1) {
          setDepenseRows(depenseRows.filter((_, i) => i !== index))
        }
        break
      case 'retrait':
        if (retraitRows.length > 1) {
          setRetraitRows(retraitRows.filter((_, i) => i !== index))
        }
        break
    }
  }

  // Add handleSiteChange function
  const handleSiteChange = (index: number) => {
    setCurrentSiteIndex(index)
    setCurrentFormIndex(0)
    loadForm(sites[index].forms[0])
  }

  // Add handleAddSite function
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

  // Add handleDeleteSite function
  const handleDeleteSite = (siteIndex: number) => {
    if (siteIndex === 0) {
      alert("Cannot delete the default site")
      return
    }
    const newSites = sites.filter((_, index: number) => index !== siteIndex)
    setSites(newSites)
    if (currentSiteIndex >= siteIndex) {
      setCurrentSiteIndex(Math.max(0, currentSiteIndex - 1))
    }
  }

  // Add handlePreviousForm function
  const handlePreviousForm = () => {
    if (currentFormIndex > 0) {
      // Save current form state
      const updatedForms = [...sites[currentSiteIndex].forms]
      updatedForms[currentFormIndex] = {
        ...updatedForms[currentFormIndex],
        creditRows: [...creditRows],
        creditPayeeRows: [...creditPayeeRows],
        depenseRows: [...depenseRows],
        retraitRows: [...retraitRows],
        fond,
        soldeALinstant,
        soldeDeDebut,
        multiplier,
        result
      }

      const updatedSite = {
        ...sites[currentSiteIndex],
        forms: updatedForms
      }
      handleUpdateSite(currentSiteIndex, updatedSite)

      // Navigate to previous form
      setCurrentFormIndex(currentFormIndex - 1)
      loadForm(updatedForms[currentFormIndex - 1])
    }
  }

  // Add handleNextForm function
  const handleNextForm = () => {
    if (currentFormIndex < sites[currentSiteIndex].forms.length - 1) {
      // Save current form state
      const updatedForms = [...sites[currentSiteIndex].forms]
      updatedForms[currentFormIndex] = {
        ...updatedForms[currentFormIndex],
        creditRows: [...creditRows],
        creditPayeeRows: [...creditPayeeRows],
        depenseRows: [...depenseRows],
        retraitRows: [...retraitRows],
        fond,
        soldeALinstant,
        soldeDeDebut,
        multiplier,
        result
      }

      const updatedSite = {
        ...sites[currentSiteIndex],
        forms: updatedForms
      }
      handleUpdateSite(currentSiteIndex, updatedSite)

      // Navigate to next form
      setCurrentFormIndex(currentFormIndex + 1)
      loadForm(updatedForms[currentFormIndex + 1])
    }
  }

  // Add handleAddForm function
  const handleAddForm = () => {
    const newForm: Form = {
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
    }

    const updatedForms = [...sites[currentSiteIndex].forms]
    updatedForms[currentFormIndex] = {
      ...updatedForms[currentFormIndex],
      creditRows: [...creditRows],
      creditPayeeRows: [...creditPayeeRows],
      depenseRows: [...depenseRows],
      retraitRows: [...retraitRows],
      fond,
      soldeALinstant,
      soldeDeDebut,
      multiplier,
      result
    }

    const updatedSite = {
      ...sites[currentSiteIndex],
      forms: [...updatedForms, newForm]
    }
    handleUpdateSite(currentSiteIndex, updatedSite)
    setCurrentFormIndex(updatedSite.forms.length - 1)
    handleReset()
  }

  // Add inside NewCalculator component, the missing updateRow function
  const updateRow = (
    tableType: keyof RowField,
    index: number,
    field: RowField[typeof tableType],
    value: string
  ) => {
    switch (tableType) {
      case 'credit': {
        const newCreditRows = [...creditRows]
        ;(newCreditRows[index] as any)[field] = value
        if (field === 'details') {
          const numbers = value.split('+')
            .map(num => parseFloat(num.trim()))
            .filter(num => !isNaN(num))
          const total = numbers.reduce((acc, num) => acc + num, 0)
          newCreditRows[index].totalClient = total.toFixed(1)
        }
        setCreditRows(newCreditRows)
        break
      }

      case 'creditPayee': {
        const newCreditPayeeRows = [...creditPayeeRows]
        ;(newCreditPayeeRows[index] as any)[field] = value
        if (field === 'details') {
          const numbers = value.split('+')
            .map(num => parseFloat(num.trim()))
          const total = numbers.reduce((acc, num) => acc + num, 0)
          newCreditPayeeRows[index].totalPayee = total.toFixed(1)
        }
        setCreditPayeeRows(newCreditPayeeRows)
        break
      }

      case 'depense': {
        const newDepenseRows = [...depenseRows]
        ;(newDepenseRows[index] as any)[field] = value
        if (field === 'details') {
          const numbers = value.split('+')
            .map(num => parseFloat(num.trim()))
          const total = numbers.reduce((acc, num) => acc + num, 0)
          newDepenseRows[index].totalDepense = total.toFixed(1)
        }
        setDepenseRows(newDepenseRows)
        break
      }

      case 'retrait': {
        const newRetraitRows = [...retraitRows]
        ;(newRetraitRows[index] as any)[field] = value

        if (field === 'retrait') {
          const retraitValue = parseFloat(value) || 0
          newRetraitRows[index].retraitPayee = 'OK'
          newRetraitRows[index].retrait = value

          const currentSolde = soldeALinstant.trim() ? parseFloat(soldeALinstant) || 0 : 0
          setSoldeALinstant(`${currentSolde} + ${retraitValue}`)
        }

        if (field === 'retraitPayee') {
          if (value.toLowerCase() !== 'ok' && (value === '' || /^\d*\.?\d*$/.test(value))) {
            newRetraitRows[index].retraitPayee = value
          }
        }

        setRetraitRows(newRetraitRows)
        break
      }
    }
  }

  // Return early if not mounted
  if (!mounted) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full m-0 p-0">
        <div className={`w-full rounded-none sm:rounded-3xl shadow-lg sm:p-8 mt-0 sm:mt-12 mb-20 sm:max-w-7xl sm:mx-auto ${SITE_COLORS[sites[currentSiteIndex]?.color || 'none'].bg}`}>
          <div className="w-full m-0 p-0">
            {/* Add SiteCarousel here */}
            <SiteCarousel
              sites={sites}
              currentSiteIndex={currentSiteIndex}
              onSiteChange={handleSiteChange}
              onAddSite={handleAddSite}
              onUpdateSite={handleUpdateSite}
              onDeleteSite={handleDeleteSite}
            />

            {/* Form Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={handlePreviousForm}
                disabled={currentFormIndex === 0}
                className="p-2 rounded-full bg-gray-200 disabled:opacity-50"
              >
                <ChevronLeft size={24} />
              </button>
              <div className="flex items-center">
                <span className="text-lg font-semibold mr-2">
                  Form {currentFormIndex + 1} / {sites[currentSiteIndex].forms.length}
                </span>
                <button
                  onClick={handleAddForm}
                  className="p-1 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                >
                  <Plus size={20} />
                </button>
              </div>
              <button
                onClick={handleNextForm}
                disabled={currentFormIndex === sites[currentSiteIndex].forms.length - 1}
                className="p-2 rounded-full bg-gray-200 disabled:opacity-50"
              >
                <ChevronRight size={24} />
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleCalculate} className="space-y-6">
              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div>
                  <LanguageSelector
                    selectedLanguage={voiceLanguage}
                    onLanguageChange={setVoiceLanguage}
                  />
                </div>
                <div>
                  <select
                    id="multiplierSelect"
                    value={multiplier}
                    onChange={(e) => setMultiplier(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="1">1</option>
                    <option value="1.1">1.1</option>
                    <option value="1.2">1.2</option>
                    <option value="1.3">1.3</option>
                  </select>
                </div>
                <div>
                  <div className="relative">
                    <input
                      type="text"
                      id="fond"
                      value={fond}
                      onChange={(e) => setFond(e.target.value)}
                      placeholder="Fond"
                      aria-label="Fond input"
                      aria-invalid={!!errors.fond}
                      aria-describedby={errors.fond ? "fond-error" : undefined}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <VoiceInputButton 
                      onVoiceInput={() => handleVoiceInputWithFeedback(setFond)}
                      showButton={voiceLanguage !== 'none'}
                      voiceLanguage={voiceLanguage}
                    />
                  </div>
                  {errors.fond && <span id="fond-error" className="text-red-500 text-sm">{errors.fond}</span>}
                </div>
                <div>
                  <label htmlFor="solde_a_linstant" className="block text-sm font-medium text-gray-700 mb-1">
                    Solde à l'instant
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="solde_a_linstant"
                      value={soldeALinstant}
                      onChange={(e) => setSoldeALinstant(e.target.value)}
                      placeholder="Solde à l'instant"
                      aria-label="Solde à l'instant input"
                      aria-invalid={!!errors.soldeALinstant}
                      aria-describedby={errors.soldeALinstant ? "soldeALinstant-error" : undefined}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <VoiceInputButton 
                      onVoiceInput={() => handleVoiceInputWithFeedback(setSoldeALinstant)}
                      showButton={voiceLanguage !== 'none'}
                      voiceLanguage={voiceLanguage}
                    />
                  </div>
                  {errors.soldeALinstant && <span id="soldeALinstant-error" className="text-red-500 text-sm">{errors.soldeALinstant}</span>}
                </div>
                <div>
                  <div className="relative">
                    <input
                      type="text"
                      id="site"
                      value={site}
                      onChange={(e) => setSite(e.target.value)}
                      placeholder="Site"
                      aria-label="Site input"
                      aria-invalid={!!errors.site}
                      aria-describedby={errors.site ? "site-error" : undefined}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <VoiceInputButton 
                      onVoiceInput={() => handleVoiceInputWithFeedback(setSite, false)}
                      showButton={voiceLanguage !== 'none'}
                      voiceLanguage={voiceLanguage}
                    />
                  </div>
                  {errors.site && <span id="site-error" className="text-red-500 text-sm">{errors.site}</span>}
                </div>
                <div>
                  <label htmlFor="solde_de_debut" className="block text-sm font-medium text-gray-700 mb-1">
                    Solde de début
                  </label>
                  <div className="relative">
                    <textarea
                      id="solde_de_debut"
                      value={soldeDeDebut}
                      onChange={(e) => setSoldeDeDebut(e.target.value)}
                      placeholder="Solde de début"
                      aria-label="Solde de début input"
                      aria-invalid={!!errors.soldeDeDebut}
                      aria-describedby={errors.soldeDeDebut ? "soldeDeDebut-error" : undefined}
                      className={`
                        w-full 
                        min-h-[38px] 
                        resize-none 
                        overflow-hidden 
                        px-2 
                        py-1 
                        rounded
                        whitespace-normal
                        break-words
                        font-mono
                        text-base
                        leading-relaxed
                        border border-gray-300 
                        focus:outline-none 
                        focus:ring-2 
                        focus:ring-blue-500
                      `}
                      rows={1}
                      onInput={(e) => {
                        e.currentTarget.style.height = 'auto'
                        const newHeight = Math.max(38, e.currentTarget.scrollHeight)
                        e.currentTarget.style.height = `${newHeight}px`
                      }}
                      style={{
                        wordBreak: 'break-word',
                        wordWrap: 'break-word',
                        whiteSpace: 'pre-wrap'
                      }}
                      required
                    />
                    <VoiceInputButton 
                      onVoiceInput={() => handleVoiceInputWithFeedback(setSoldeDeDebut)}
                      showButton={voiceLanguage !== 'none'}
                      voiceLanguage={voiceLanguage}
                    />
                  </div>
                  {errors.soldeDeDebut && <span id="soldeDeDebut-error" className="text-red-500 text-sm">{errors.soldeDeDebut}</span>}
                </div>
              </div>

              {/* Tables Section */}
              <div className="space-y-8">
                {/* Credit Table */}
                <div>
                  <div className="flex items-center mb-4">
                    <h3 className="text-xl font-semibold flex-1 text-center">Crédit</h3>
                    <button
                      type="button"
                      onClick={() => addRow('credit')}
                      className="p-1 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <colgroup>
                        <col className="w-[40px]" />
                        <col className="w-[50px] sm:w-[70px]" />
                        <col />
                        <col className="w-[90px] sm:w-[110px]" />
                      </colgroup>
                      <tbody>
                        {creditRows.map((row, index) => (
                          <tr key={index}>
                            <td className="p-2">
                              <button
                                type="button"
                                onClick={() => removeRow('credit', index)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={row.totalClient}
                                readOnly
                                className="w-full bg-gray-50 text-right font-mono px-2 py-1 rounded"
                                maxLength={4}
                              />
                            </td>
                            <td className="p-2 border-l border-r border-gray-200">
                              <div className="relative w-full">
                                <textarea
                                  value={row.details}
                                  placeholder="Détails"
                                  onChange={(e) => updateRow('credit', index, 'details', e.target.value)}
                                  className="w-full min-h-[38px] resize-none overflow-hidden px-2 py-1 rounded whitespace-normal break-words font-mono text-base leading-relaxed text-right"
                                  rows={1}
                                  onInput={(e) => {
                                    e.currentTarget.style.height = 'auto'
                                    const newHeight = Math.max(38, e.currentTarget.scrollHeight)
                                    e.currentTarget.style.height = `${newHeight}px`
                                  }}
                                />
                                <VoiceInputButton 
                                  onVoiceInput={() => handleVoiceInputWithFeedback(
                                    (value) => updateRow('credit', index, 'details', value)
                                  )}
                                  showButton={voiceLanguage !== 'none'}
                                  voiceLanguage={voiceLanguage}
                                />
                              </div>
                            </td>
                            <td className="p-2">
                              <div className="relative">
                                <textarea
                                  value={row.client}
                                  placeholder="Client"
                                  onChange={(e) => updateRow('credit', index, 'client', e.target.value)}
                                  className="w-full min-h-[38px] resize-none overflow-hidden px-1 py-1 rounded whitespace-normal break-words font-mono text-base leading-relaxed text-right"
                                  rows={1}
                                  onInput={(e) => {
                                    e.currentTarget.style.height = 'auto'
                                    const newHeight = Math.max(38, e.currentTarget.scrollHeight)
                                    e.currentTarget.style.height = `${newHeight}px`
                                  }}
                                />
                                <VoiceInputButton 
                                  onVoiceInput={() => handleVoiceInputWithFeedback(
                                    (value) => updateRow('credit', index, 'client', value),
                                    false
                                  )}
                                  showButton={voiceLanguage !== 'none'}
                                  voiceLanguage={voiceLanguage}
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Credit Payee Table */}
                <div>
                  <div className="flex items-center mb-4">
                    <h3 className="text-xl font-semibold flex-1 text-center">Crédit Payée</h3>
                    <button
                      type="button"
                      onClick={() => addRow('creditPayee')}
                      className="p-1 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <colgroup>
                        <col className="w-[40px]" />
                        <col className="w-[50px] sm:w-[70px]" />
                        <col />
                        <col className="w-[90px] sm:w-[110px]" />
                      </colgroup>
                      <tbody>
                        {creditPayeeRows.map((row, index) => (
                          <tr key={index}>
                            <td className="p-2">
                              <button
                                type="button"
                                onClick={() => removeRow('creditPayee', index)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={row.totalPayee}
                                readOnly
                                className="w-full bg-gray-50 text-right font-mono px-2 py-1 rounded"
                                maxLength={4}
                              />
                            </td>
                            <td className="p-2 border-l border-r border-gray-200">
                              <div className="relative w-full">
                                <textarea
                                  value={row.details}
                                  placeholder="Détails"
                                  onChange={(e) => updateRow('creditPayee', index, 'details', e.target.value)}
                                  className="w-full min-h-[38px] resize-none overflow-hidden px-2 py-1 rounded whitespace-normal break-words font-mono text-base leading-relaxed text-right"
                                  rows={1}
                                  onInput={(e) => {
                                    e.currentTarget.style.height = 'auto'
                                    const newHeight = Math.max(38, e.currentTarget.scrollHeight)
                                    e.currentTarget.style.height = `${newHeight}px`
                                  }}
                                />
                                <VoiceInputButton 
                                  onVoiceInput={() => handleVoiceInputWithFeedback(
                                    (value) => updateRow('creditPayee', index, 'details', value)
                                  )}
                                  showButton={voiceLanguage !== 'none'}
                                  voiceLanguage={voiceLanguage}
                                />
                              </div>
                            </td>
                            <td className="p-2">
                              <div className="relative">
                                <textarea
                                  value={row.client}
                                  placeholder="Client"
                                  onChange={(e) => updateRow('creditPayee', index, 'client', e.target.value)}
                                  className="w-full min-h-[38px] resize-none overflow-hidden px-1 py-1 rounded whitespace-normal break-words font-mono text-base leading-relaxed text-right"
                                  rows={1}
                                  onInput={(e) => {
                                    e.currentTarget.style.height = 'auto'
                                    const newHeight = Math.max(38, e.currentTarget.scrollHeight)
                                    e.currentTarget.style.height = `${newHeight}px`
                                  }}
                                />
                                <VoiceInputButton 
                                  onVoiceInput={() => handleVoiceInputWithFeedback(
                                    (value) => updateRow('creditPayee', index, 'client', value),
                                    false
                                  )}
                                  showButton={voiceLanguage !== 'none'}
                                  voiceLanguage={voiceLanguage}
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Depense Table */}
                <div>
                  <div className="flex items-center mb-4">
                    <h3 className="text-xl font-semibold flex-1 text-center">Dépense</h3>
                    <button
                      type="button"
                      onClick={() => addRow('depense')}
                      className="p-1 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <colgroup>
                        <col className="w-[40px]" />
                        <col className="w-[50px] sm:w-[70px]" />
                        <col />
                        <col className="w-[90px] sm:w-[110px]" />
                      </colgroup>
                      <tbody>
                        {depenseRows.map((row: DepenseRow, index: number) => (
                          <tr key={index}>
                            <td className="p-2">
                              <button
                                type="button"
                                onClick={() => removeRow('depense', index)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={row.totalDepense}
                                readOnly
                                className="w-full bg-gray-50 text-right font-mono px-2 py-1 rounded"
                                maxLength={4}
                              />
                            </td>
                            <td className="p-2 border-l border-r border-gray-200">
                              <div className="relative w-full">
                                <textarea
                                  value={row.details}
                                  placeholder="Détails"
                                  onChange={(e) => updateRow('depense', index, 'details', e.target.value)}
                                  className="w-full min-h-[38px] resize-none overflow-hidden px-2 py-1 rounded whitespace-normal break-words font-mono text-base leading-relaxed text-right"
                                  rows={1}
                                  onInput={(e) => {
                                    e.currentTarget.style.height = 'auto'
                                    const newHeight = Math.max(38, e.currentTarget.scrollHeight)
                                    e.currentTarget.style.height = `${newHeight}px`
                                  }}
                                />
                                <VoiceInputButton 
                                  onVoiceInput={() => handleVoiceInputWithFeedback(
                                    (value) => updateRow('depense', index, 'details', value)
                                  )}
                                  showButton={voiceLanguage !== 'none'}
                                  voiceLanguage={voiceLanguage}
                                />
                              </div>
                            </td>
                            <td className="p-2">
                              <div className="relative">
                                <textarea
                                  value={row.client}
                                  placeholder="Client"
                                  onChange={(e) => updateRow('depense', index, 'client', e.target.value)}
                                  className="w-full min-h-[38px] resize-none overflow-hidden px-1 py-1 rounded whitespace-normal break-words font-mono text-base leading-relaxed text-right"
                                  rows={1}
                                  onInput={(e) => {
                                    e.currentTarget.style.height = 'auto'
                                    const newHeight = Math.max(38, e.currentTarget.scrollHeight)
                                    e.currentTarget.style.height = `${newHeight}px`
                                  }}
                                />
                                <VoiceInputButton 
                                  onVoiceInput={() => handleVoiceInputWithFeedback(
                                    (value) => updateRow('depense', index, 'client', value),
                                    false
                                  )}
                                  showButton={voiceLanguage !== 'none'}
                                  voiceLanguage={voiceLanguage}
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Retrait Table */}
                <div>
                  <div className="flex items-center mb-4">
                    <h3 className="text-xl font-semibold flex-1 text-center">Retrait</h3>
                    <button
                      type="button"
                      onClick={() => addRow('retrait')}
                      className="p-1 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <colgroup>
                        <col className="w-[40px]" />
                        <col className="w-[50px] sm:w-[70px]" />
                        <col className="w-[50px] sm:w-[70px]" />
                        <col className="w-[90px] sm:w-[110px]" />
                      </colgroup>
                      <tbody>
                        {retraitRows.map((row: RetraitRow, index: number) => (
                          <tr key={index}>
                            <td className="p-2">
                              <button
                                type="button"
                                onClick={() => removeRow('retrait', index)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={row.retraitPayee}
                                onChange={(e) => updateRow('retrait', index, 'retraitPayee', e.target.value)}
                                className="w-full bg-gray-50 text-right font-mono px-2 py-1 rounded"
                              />
                            </td>
                            <td className="p-2 border-l border-r border-gray-200">
                              <div className="relative w-full">
                                <textarea
                                  value={row.retrait}
                                  onChange={(e) => {
                                    const value = e.target.value
                                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                      updateRow('retrait', index, 'retrait', value)
                                    }
                                  }}
                                  className="w-full min-h-[38px] resize-none overflow-hidden px-2 py-1 rounded whitespace-normal break-words font-mono text-base leading-relaxed text-right"
                                  rows={1}
                                  onInput={(e) => {
                                    e.currentTarget.style.height = 'auto'
                                    const newHeight = Math.max(38, e.currentTarget.scrollHeight)
                                    e.currentTarget.style.height = `${newHeight}px`
                                  }}
                                />
                                <VoiceInputButton 
                                  onVoiceInput={() => handleVoiceInputWithFeedback(
                                    (value) => updateRow('retrait', index, 'retrait', value)
                                  )}
                                  showButton={voiceLanguage !== 'none'}
                                  voiceLanguage={voiceLanguage}
                                />
                              </div>
                            </td>
                            <td className="p-2">
                              <div className="relative">
                                <textarea
                                  value={row.client}
                                  placeholder="Client"
                                  onChange={(e) => updateRow('retrait', index, 'client', e.target.value)}
                                  className="w-full min-h-[38px] resize-none overflow-hidden px-1 py-1 rounded whitespace-normal break-words font-mono text-base leading-relaxed text-right"
                                  rows={1}
                                  onInput={(e) => {
                                    e.currentTarget.style.height = 'auto'
                                    const newHeight = Math.max(38, e.currentTarget.scrollHeight)
                                    e.currentTarget.style.height = `${newHeight}px`
                                  }}
                                />
                                <VoiceInputButton 
                                  onVoiceInput={() => handleVoiceInputWithFeedback(
                                    (value) => updateRow('retrait', index, 'client', value),
                                    false
                                  )}
                                  showButton={voiceLanguage !== 'none'}
                                  voiceLanguage={voiceLanguage}
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Result */}
              <div className="mt-8 text-center p-4 bg-white rounded-lg">
                <h2 className="text-xl font-bold mb-2">Result</h2>
                <p className="text-3xl font-bold text-blue-600">{result}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center gap-4 mt-8">
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                >
                  Calculate
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
                >
                  <RotateCcw size={20} />
                  Reset
                </button>
                <button
                  type="button"
                  onClick={handleDeleteForm}
                  className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
                >
                  <Trash size={20} />
                  Delete Form
                </button>
              </div>
            </form>

            {/* History Slider */}
            <HistorySlider
              forms={sites[currentSiteIndex].forms}
              currentFormIndex={currentFormIndex}
              onFormSelect={(index: number, historicalForm?: Form) => {
                setCurrentFormIndex(index)
                if (historicalForm) {
                  loadForm(historicalForm)
                } else {
                  loadForm(sites[currentSiteIndex].forms[index])
                }
              }}
              siteColor={sites[currentSiteIndex].color || 'none'}
              removeRow={removeRow}
              updateRow={updateRow}
              handleVoiceInputWithFeedback={handleVoiceInputWithFeedback}
              voiceLanguage={voiceLanguage}
              addRow={addRow}
            />
          </div>
        </div>
      </div>
    </div>
  )
}