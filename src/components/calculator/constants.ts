import { SiteColor } from './types'

export const SITE_COLORS: { [key in SiteColor]: { bg: string; hover: string; ring: string } } = {
  none: { bg: 'bg-white', hover: 'hover:bg-gray-50', ring: 'ring-gray-200' },
  blue: { bg: 'bg-blue-100', hover: 'hover:bg-blue-200', ring: 'ring-blue-300' },
  green: { bg: 'bg-green-100', hover: 'hover:bg-green-200', ring: 'ring-green-300' },
  yellow: { bg: 'bg-yellow-100', hover: 'hover:bg-yellow-200', ring: 'ring-yellow-300' },
  purple: { bg: 'bg-purple-100', hover: 'hover:bg-purple-200', ring: 'ring-purple-300' },
  red: { bg: 'bg-red-100', hover: 'hover:bg-red-200', ring: 'ring-red-300' }
}

export const LANGUAGE_OPTIONS = [
  { code: 'none' as const, label: 'No Voice Input', flag: '🔇' },
  { code: 'ar-SA' as const, label: 'العربية', flag: '🇸🇦' },
  { code: 'fr-FR' as const, label: 'Français', flag: '🇫🇷' },
  { code: 'en-US' as const, label: 'English', flag: '🇺🇸' }
] 