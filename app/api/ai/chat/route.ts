import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAiProvider } from '@/services/ai/provider';
import { retrieveApprovedContext } from '@/services/ai/rag';
import { triageSymptoms } from '@/services/ai/triage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type RequestBody = { conversationId?: unknown; message?: unknown };

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    const body = await request.json() as RequestBody;
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const conversationId = typeof body.conversationId === 'string' ? body.conversationId : undefined;
    if (!message || message.length > 4000) return NextResponse.json({ error: 'Message is required and must be no more than 4,000 characters.' }, { status: 400 });
    if (conversationId && !uuidPattern.test(conversationId)) return NextResponse.json({ error: 'Invalid conversation ID.' }, { status: 400 });

    const { data: patient, error: patientError } = await supabase.from('patients').select('id').eq('user_id', user.id).single();
    if (patientError || !patient) return NextResponse.json({ error: 'A patient profile is required to use the assistant.' }, { status: 403 });

    let activeConversationId = conversationId;
    if (activeConversationId) {
      const { data: conversation } = await supabase.from('ai_conversations').select('id').eq('id', activeConversationId).single();
      if (!conversation) return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 });
    } else {
      const { data: conversation, error } = await supabase.from('ai_conversations').insert({ patient_id: patient.id, title: message.slice(0, 80) }).select('id').single();
      if (error || !conversation) return NextResponse.json({ error: 'Could not start the conversation.' }, { status: 500 });
      activeConversationId = conversation.id;
    }

    const { error: userMessageError } = await supabase.from('ai_messages').insert({ conversation_id: activeConversationId, patient_id: patient.id, role: 'user', content: message });
    if (userMessageError) return NextResponse.json({ error: 'Could not save your message.' }, { status: 500 });

    const triage = triageSymptoms(message);
    let responseText = triage.immediateResponse;
    if (!responseText) {
      try {
        const provider = createAiProvider();
        const sources = await retrieveApprovedContext(supabase, provider, message);
        if (sources.length === 0) {
          responseText = 'I do not have enough approved medical evidence to answer that safely. Please arrange an evaluation with a qualified healthcare professional, especially if your symptoms persist or worsen.';
        } else {
          const { data: history } = await supabase.from('ai_messages').select('role, content').eq('conversation_id', activeConversationId).order('created_at', { ascending: true }).limit(20);
          responseText = await provider.generatePreliminaryGuidance({ messages: (history ?? []).filter((turn): turn is { role: 'user' | 'assistant'; content: string } => turn.role === 'user' || turn.role === 'assistant'), retrievedSources: sources });
        }
      } catch {
        return NextResponse.json({ error: 'The evidence retrieval or health assistant service is temporarily unavailable. Your message was saved; please try again shortly or seek professional care if you are concerned.' }, { status: 502 });
      }
    }

    const { error: assistantMessageError } = await supabase.from('ai_messages').insert({ conversation_id: activeConversationId, patient_id: patient.id, role: 'assistant', content: responseText });
    if (assistantMessageError) return NextResponse.json({ error: 'The response could not be saved securely.' }, { status: 500 });
    const { data: assessment, error: assessmentError } = await supabase.from('symptom_assessments').insert({ conversation_id: activeConversationId, patient_id: patient.id, classification: triage.classification, red_flags: triage.redFlags, recommended_next_step: triage.recommendedNextStep }).select('id, classification, red_flags, recommended_next_step, created_at').single();
    if (assessmentError || !assessment) return NextResponse.json({ error: 'The assessment could not be saved securely.' }, { status: 500 });
    await supabase.from('ai_conversations').update({ updated_at: new Date().toISOString() }).eq('id', activeConversationId);
    return NextResponse.json({ conversationId: activeConversationId, message: { role: 'assistant', content: responseText }, assessment });
  } catch {
    return NextResponse.json({ error: 'We could not process that request. Please try again.' }, { status: 500 });
  }
}
