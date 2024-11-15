import { useCallback } from 'react'
import { VoiceLanguage } from '../types'
import { processVoiceInput } from '../utils/processVoiceInput'

declare global {
  interface Window {
    webkitSpeechRecognition: any;
  }
}

interface SpeechRecognitionEvent {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
}

export const useVoiceInput = (voiceLanguage: VoiceLanguage, setIsListening: (isListening: boolean) => void) => {
  const handleVoiceInput = useCallback((
    callback: (value: string) => void,
    isNumberField: boolean = true
  ) => {
    if (!window.webkitSpeechRecognition) {
      alert('Speech recognition is not supported in this browser')
      return
    }

    const recognition = new window.webkitSpeechRecognition()
    recognition.lang = voiceLanguage
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onstart = () => {
      setIsListening(true)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript
      const processed = processVoiceInput(transcript, isNumberField)
      callback(processed)
    }

    recognition.start()
  }, [voiceLanguage, setIsListening])

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

  return { handleVoiceInput, handleVoiceInputWithFeedback }
} 