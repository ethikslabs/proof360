import { describe, it, expect } from 'vitest';
import {
  confirmPromptBlock,
  interpretConfirmReply,
  fieldQuestion,
  ceremonyResultNote,
  proposalPromptBlock,
} from '../../src/services/confirm-ceremony.js';

const awsClaim = {
  claim_id: 'clm-aws',
  field: 'infrastructure.cloud_provider',
  value: 'aws',
  status: 'inferred',
  provenance: { method: 'recon-ip', detail: 'ASN AS16509 Amazon', at: '2026-08-22T01:00:00Z' },
};

describe('confirmPromptBlock', () => {
  it('instructs the persona to ask exactly one natural confirm, citing the source', () => {
    const block = confirmPromptBlock(awsClaim);
    expect(block).toContain('AWS');
    expect(block).toContain('ASN AS16509 Amazon');
    expect(block.toLowerCase()).toContain('one');
    // never a form — the instruction is to weave it into the reply
    expect(block.toLowerCase()).toMatch(/natural|conversation/);
  });

  it('returns an empty string for nothing-to-confirm', () => {
    expect(confirmPromptBlock(null)).toBe('');
  });
});

describe('fieldQuestion — human phrasing per field', () => {
  it('knows the acceptance-walk field', () => {
    expect(fieldQuestion(awsClaim)).toMatch(/looks like you'?re on AWS/i);
  });
  it('falls back to a generic phrasing for unmapped fields', () => {
    const q = fieldQuestion({ field: 'x.y', value: 'zed' });
    expect(q).toContain('zed');
  });
});

describe('proposalPromptBlock — the shortlist moment in conversation', () => {
  it('hands the persona one proposal with its reason to disclose', () => {
    const block = proposalPromptBlock({
      id: 'cap-vanta', title: 'Vanta',
      reason: 'Vanta proposed because the soc2 gap is open on your read.',
    });
    expect(block).toContain('Vanta');
    expect(block).toContain('soc2 gap is open');
    expect(block.toLowerCase()).toContain('shortlist');
    // the disclosed-stake model: the reason is spoken, never hidden
    expect(block.toLowerCase()).toMatch(/reason|because/);
  });
  it('empty when there is nothing to propose', () => {
    expect(proposalPromptBlock(null)).toBe('');
  });
});

describe('ceremonyResultNote — tell the persona what testimony just landed', () => {
  it('names the field and outcome so the persona acknowledges, never re-asks', () => {
    const note = ceremonyResultNote(awsClaim, { type: 'confirmed' });
    expect(note).toContain('infrastructure.cloud_provider');
    expect(note).toContain('confirmed');
    const corrected = ceremonyResultNote(awsClaim, { type: 'corrected', value: 'gcp' });
    expect(corrected).toContain('gcp');
  });
  it('empty for no answer', () => {
    expect(ceremonyResultNote(awsClaim, null)).toBe('');
  });
});

describe('interpretConfirmReply — deterministic capture, never a guess', () => {
  it('a plain yes confirms', () => {
    for (const msg of ['yes', 'Yes', 'yep', 'yeah we are', 'correct', "that's right"]) {
      expect(interpretConfirmReply(msg, awsClaim)).toEqual({ type: 'confirmed' });
    }
  });

  it('a bare no rejects', () => {
    expect(interpretConfirmReply('no', awsClaim)).toEqual({ type: 'rejected' });
    expect(interpretConfirmReply('Nope', awsClaim)).toEqual({ type: 'rejected' });
  });

  it('a no with an alternative corrects with the user text as the value', () => {
    const r = interpretConfirmReply("no, we're on GCP", awsClaim);
    expect(r.type).toBe('corrected');
    expect(r.value).toBe("we're on GCP");
    const r2 = interpretConfirmReply('actually we use Azure', awsClaim);
    expect(r2.type).toBe('corrected');
    expect(r2.value).toBe('we use Azure');
  });

  it('anything ambiguous returns null — the ceremony never writes on a guess', () => {
    expect(interpretConfirmReply('what does SOC 2 cost?', awsClaim)).toBeNull();
    expect(interpretConfirmReply('tell me more about that', awsClaim)).toBeNull();
    expect(interpretConfirmReply('', awsClaim)).toBeNull();
    expect(interpretConfirmReply('yes but what about pricing and also no', awsClaim)).toBeNull();
  });

  it('returns null with no pending claim', () => {
    expect(interpretConfirmReply('yes', null)).toBeNull();
  });
});
