export type TriageResult = { classification: 'urgent' | 'non_urgent'; redFlags: string[]; recommendedNextStep: string; immediateResponse?: string };

const urgentSignals: Array<{ label: string; patterns: RegExp[] }> = [
  { label: 'possible breathing emergency', patterns: [/severe(?:ly)?\s+(?:difficulty|trouble)\s+breath/i, /cannot\s+breathe/i, /blue\s+(?:lips|face)/i] },
  { label: 'possible cardiac emergency', patterns: [/severe\s+chest\s+pain/i, /crushing\s+chest\s+pain/i, /chest\s+pain.*(?:sweat|breath|arm|jaw)/i] },
  { label: 'possible stroke warning sign', patterns: [/(?:face|arm)\s+(?:is\s+)?droop/i, /speech\s+(?:is\s+)?slur/i, /sudden\s+weakness\s+(?:on\s+)?one\s+side/i] },
  { label: 'severe bleeding or loss of consciousness', patterns: [/uncontrolled\s+bleeding/i, /fainted\s+and\s+(?:not|won't)\s+wake/i, /unconscious/i, /seizure/i] },
  { label: 'immediate safety concern', patterns: [/suicid(?:e|al)/i, /want\s+to\s+die/i, /going\s+to\s+hurt\s+(?:myself|someone)/i] },
];

export function triageSymptoms(text: string): TriageResult {
  const redFlags = urgentSignals.filter(({ patterns }) => patterns.some((pattern) => pattern.test(text))).map(({ label }) => label);
  if (redFlags.length > 0) return { classification: 'urgent', redFlags, recommendedNextStep: 'Contact local emergency services now or go to the nearest emergency department. Do not drive yourself if you feel faint, confused, or severely unwell.', immediateResponse: 'Some symptoms you described may need urgent medical attention. Please contact your local emergency services now or go to the nearest emergency department. This assistant cannot assess emergencies or replace a clinician.' };
  return { classification: 'non_urgent', redFlags: [], recommendedNextStep: 'Review the general information, monitor your symptoms, and arrange a qualified healthcare professional evaluation if symptoms persist, worsen, or concern you.' };
}
