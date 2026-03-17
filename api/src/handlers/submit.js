import { getSession, updateSession } from '../services/session-store.js';
import { runGapAnalysis } from '../services/gap-mapper.js';

export async function submitHandler(request, reply) {
  const { id } = request.params;
  const session = getSession(id);

  if (!session) {
    return reply.status(404).send({ error: 'Session not found' });
  }

  if (session.infer_status !== 'complete') {
    return reply.status(409).send({ error: 'Inferences not ready yet' });
  }

  const { corrections, followup_answers } = request.body || {};

  // Store corrections and answers
  updateSession(id, {
    corrections: corrections || {},
    followup_answers: followup_answers || {},
    analysis_status: 'processing',
  });

  // Kick off gap analysis async
  analyzeAsync(id, session, corrections || {}, followup_answers || {});

  return reply.send({ status: 'processing' });
}

async function analyzeAsync(sessionId, session, corrections, followup_answers) {
  try {
    // Merge inferred signals + corrections + follow-up answers into a context object
    const context = buildContext(session, corrections, followup_answers);

    const result = await runGapAnalysis(context);

    // Build the non-negotiable signals object (brief-strategy.md)
    const signals = {
      session_id: sessionId,
      company_name: session.company_name,
      website: session.website_url,
      deck_uploaded: !!session.deck_file,
      stage: context.stage || 'unknown',
      sector: context.sector || 'unknown',
      primary_use_case: context.use_case || 'enterprise_sales',
      questions_answered: Object.entries(followup_answers).map(([qid, answer]) => ({
        question_id: qid,
        answer,
      })),
      gaps: result.gaps,
      trust_score: result.trust_score,
      deal_readiness: result.readiness,
      email_captured: false,
      timestamp: new Date().toISOString(),
      source: 'website',
    };

    updateSession(sessionId, {
      analysis_status: 'complete',
      gaps: result.gaps,
      vendors: result.vendors,
      trust_score: result.trust_score,
      readiness: result.readiness,
      signals,
    });
  } catch (err) {
    console.error(`Gap analysis failed for session ${sessionId}:`, err);
    updateSession(sessionId, { analysis_status: 'failed' });
  }
}

function buildContext(session, corrections, followup_answers) {
  // Start with inferred values
  const context = {};

  // Map correctable fields to context — use correction if provided, else inferred
  for (const field of session.correctable_fields || []) {
    context[field.key] = corrections[field.key] || field.inferred_value;
  }

  // Map follow-up answers to context fields
  const answerMap = {
    q_identity: 'identity_model',
    q_insurance: 'insurance_status',
    q_questionnaire: 'questionnaire_experience',
  };

  for (const [qid, answer] of Object.entries(followup_answers)) {
    const key = answerMap[qid];
    if (key) {
      context[key] = normalizeAnswer(key, answer);
    }
  }

  // Derive compliance_status from inferences
  const preSOC2 = (session.inferences || []).find(
    (i) => i.inference_id === 'inf_compliance'
  );
  if (preSOC2 && !context.compliance_status) {
    context.compliance_status = 'none';
  }

  return context;
}

function normalizeAnswer(key, answer) {
  const normalizers = {
    identity_model: {
      'Passwords only': 'password_only',
      'Passwords + MFA': 'mfa_only',
      'SSO (Google, Okta, etc.)': 'sso',
      'Not sure': 'unknown',
    },
    insurance_status: {
      'Yes': 'active',
      'No': 'none',
      'In progress': 'planning',
      'Not sure': 'unknown',
    },
    questionnaire_experience: {
      'Yes, completed it': 'completed',
      'Yes, it stalled a deal': 'stalled_deal',
      'No': 'none',
      'Not sure': 'unknown',
    },
  };

  return normalizers[key]?.[answer] || answer;
}
