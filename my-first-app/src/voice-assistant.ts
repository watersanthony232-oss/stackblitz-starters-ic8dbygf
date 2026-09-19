// G2 Companion - "Hey Claude" Voice Assistant (browser speech recognition)
//
// NOTE: Picovoice (proper offline wake-word + speaker verification) is
// not usable here - their signup requires a company email domain,
// which isn't available for a personal project. This uses the
// browser's built-in SpeechRecognition instead, which is a real step
// down:
//  - Not a true low-power "wake word" - it continuously transcribes
//    speech to text and checks for the phrase, using more battery and
//    requiring an internet connection (audio is sent to the browser's
//    speech-recognition service, not processed on-device).
//  - No speaker verification - this will respond to ANYONE saying
//    "Hey Claude", not just the enrolled user. That requirement is
//    dropped, not approximated, until a real speaker-recognition
//    option is found.
//  - Whether this webview even exposes microphone access the way a
//    normal Chrome tab does is untested - the G2's mic audio may only
//    be reachable through the Even Hub SDK's own audio channel, not
//    the standard getUserMedia() flow this API relies on.

import { startTimer } from './timer';

// Minimal ambient typing for the non-standard SpeechRecognition API.
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
};

const WAKE_PHRASE = 'hey claude';
let recognition: SpeechRecognitionLike | null = null;
let running = false;

function parseTimerCommand(command: string): number | null {
  // Matches things like "set a timer for 10 minutes" or "for 30 seconds".
  const minutesMatch = command.match(/(\d+)\s*minute/);
  const secondsMatch = command.match(/(\d+)\s*second/);
  if (minutesMatch || secondsMatch) {
    const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;
    const seconds = secondsMatch ? parseInt(secondsMatch[1], 10) : 0;
    return minutes * 60 + seconds;
  }
  return null;
}

function handleCommand(command: string) {
  const trimmed = command.trim().toLowerCase();
  if (trimmed.includes('timer')) {
    const totalSeconds = parseTimerCommand(trimmed);
    if (totalSeconds != null && totalSeconds > 0) {
      startTimer(totalSeconds);
      return;
    }
  }
  // TODO: other voice commands go here as they're built.
  console.log('voice assistant: unrecognised command:', command);
}

function handleTranscript(transcript: string) {
  const lower = transcript.toLowerCase();
  const wakeIndex = lower.indexOf(WAKE_PHRASE);
  if (wakeIndex === -1) return;
  const command = transcript.slice(wakeIndex + WAKE_PHRASE.length);
  if (command.trim().length > 0) {
    handleCommand(command);
  }
}

export function startVoiceAssistant() {
  const SpeechRecognitionCtor =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognitionCtor) {
    console.error('voice assistant: SpeechRecognition not supported in this webview');
    return;
  }

  recognition = new SpeechRecognitionCtor();
  recognition!.continuous = true;
  recognition!.interimResults = false;
  recognition!.lang = 'en-GB';

  recognition!.onresult = (event: any) => {
    const lastResult = event.results[event.results.length - 1];
    const transcript = lastResult[0].transcript as string;
    handleTranscript(transcript);
  };

  recognition!.onerror = (event: any) => {
    console.error('voice assistant recognition error', event.error);
  };

  // Browser speech recognition stops itself periodically (e.g. after
  // silence) - restart it automatically to approximate "always
  // listening", as long as we haven't been told to stop.
  recognition!.onend = () => {
    if (running) recognition!.start();
  };

  running = true;
  recognition!.start();
}

export function stopVoiceAssistant() {
  running = false;
  if (recognition) recognition.stop();
}
