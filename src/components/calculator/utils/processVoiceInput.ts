export const processVoiceInput = (transcript: string, isNumberField = true): string => {
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