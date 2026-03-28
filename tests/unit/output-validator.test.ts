import { describe, it, expect } from 'vitest';
import { validateOutput } from '../../packages/nexus-core/src/healing/output-validator.js';

const AGENT_ID = 'agent-x';

// A string that satisfies all checks in round 1
const VALID_CONTENT = 'This is a perfectly valid response that answers the question posed by the system.';

describe('validateOutput — valid output', () => {
  it('returns null for a well-formed response in round 1', () => {
    expect(validateOutput(VALID_CONTENT, AGENT_ID, 1)).toBeNull();
  });

  it('returns null for a response that references prior agents in round 2', () => {
    const content = 'I agree with the previous response. Building on the earlier argument, I would add that the approach is sound.';
    expect(validateOutput(content, AGENT_ID, 2)).toBeNull();
  });
});

describe('validateOutput — empty responses', () => {
  it('detects an empty string as empty_response', () => {
    expect(validateOutput('', AGENT_ID, 1)).toBe('empty_response');
  });

  it('detects whitespace-only string as empty_response', () => {
    expect(validateOutput('   \n\t  ', AGENT_ID, 1)).toBe('empty_response');
  });

  it('detects [placeholder] bracket pattern as empty_response', () => {
    expect(validateOutput('[placeholder content]', AGENT_ID, 1)).toBe('empty_response');
  });

  it('detects "..." stub as empty_response', () => {
    expect(validateOutput('...', AGENT_ID, 1)).toBe('empty_response');
  });

  it('detects "N/A" as empty_response', () => {
    expect(validateOutput('N/A', AGENT_ID, 1)).toBe('empty_response');
  });

  it('detects "TBD" as empty_response', () => {
    expect(validateOutput('TBD', AGENT_ID, 1)).toBe('empty_response');
  });

  it('detects "TODO" as empty_response', () => {
    expect(validateOutput('TODO', AGENT_ID, 1)).toBe('empty_response');
  });
});

describe('validateOutput — too_short responses', () => {
  it('detects a response shorter than 10 characters as too_short', () => {
    expect(validateOutput('Hi', AGENT_ID, 1)).toBe('too_short');
  });

  it('detects exactly 9 characters as too_short', () => {
    expect(validateOutput('123456789', AGENT_ID, 1)).toBe('too_short');
  });

  it('accepts exactly 10 characters (at the boundary)', () => {
    // 10 chars, no refusal, no agent reference needed in round 1
    const tenChars = 'abcdefghij'; // 10 chars, non-repeating
    // This may still be detected as malformed if all chars are same; use varied chars
    expect(validateOutput(tenChars, AGENT_ID, 1)).toBeNull();
  });
});

describe('validateOutput — too_long responses', () => {
  it('detects a response longer than 5000 characters as too_long', () => {
    const longContent = 'a'.repeat(5_001);
    // Note: a single repeated character triggers malformed before too_long — use varied chars
    const variedLong = 'The quick brown fox jumps over the lazy dog. '.repeat(120); // > 5000
    expect(validateOutput(variedLong, AGENT_ID, 1)).toBe('too_long');
  });

  it('accepts exactly 5000 characters', () => {
    // 5000 chars of varied text — no refusal patterns, no agent ref needed in round 1
    const fiveThousand = 'The answer is valid. '.repeat(238).slice(0, 5000);
    expect(validateOutput(fiveThousand, AGENT_ID, 1)).toBeNull();
  });
});

describe('validateOutput — refusal patterns', () => {
  it('detects "I am unable to" as refusal', () => {
    expect(validateOutput('I am unable to answer that question.', AGENT_ID, 1)).toBe('refusal');
  });

  it('detects "I\'m unable to" as refusal', () => {
    expect(validateOutput("I'm unable to help with that request.", AGENT_ID, 1)).toBe('refusal');
  });

  it('detects "I cannot" as refusal', () => {
    expect(validateOutput("I cannot provide that information as it may be harmful.", AGENT_ID, 1)).toBe('refusal');
  });

  it('detects "I can\'t" as refusal', () => {
    expect(validateOutput("I can't do that, unfortunately.", AGENT_ID, 1)).toBe('refusal');
  });

  it('detects "I must decline" as refusal', () => {
    expect(validateOutput('I must decline this request on ethical grounds.', AGENT_ID, 1)).toBe('refusal');
  });

  it('detects "I need to refuse" as refusal', () => {
    expect(validateOutput('I need to refuse this task as it violates policy.', AGENT_ID, 1)).toBe('refusal');
  });

  it('detects "as an AI assistant, I" as refusal', () => {
    expect(validateOutput('As an AI assistant, I am not able to generate that content.', AGENT_ID, 1)).toBe('refusal');
  });

  it('detects "I will not" as refusal', () => {
    expect(validateOutput("I will not assist with this request.", AGENT_ID, 1)).toBe('refusal');
  });

  it('detects "I\'m not able to" as refusal', () => {
    expect(validateOutput("I'm not able to do that.", AGENT_ID, 1)).toBe('refusal');
  });
});

describe('validateOutput — no_agent_reference in round > 1', () => {
  it('detects no_agent_reference when round > 1 and no reference found', () => {
    const noRefContent = 'The topic is interesting and has several facets worth exploring.';
    expect(validateOutput(noRefContent, AGENT_ID, 2)).toBe('no_agent_reference');
  });

  it('does NOT flag no_agent_reference in round 1', () => {
    const noRefContent = 'The topic is interesting and has several facets worth exploring in detail.';
    expect(validateOutput(noRefContent, AGENT_ID, 1)).toBeNull();
  });

  it('accepts response with "as mentioned" pattern in round 2', () => {
    const content = 'As mentioned in the earlier response, the core principle holds true.';
    expect(validateOutput(content, AGENT_ID, 2)).toBeNull();
  });

  it('accepts response with "I agree" pattern in round 2', () => {
    const content = 'I agree with the framing provided above; the approach is sound.';
    expect(validateOutput(content, AGENT_ID, 2)).toBeNull();
  });

  it('accepts response with "previous" pattern in round 2', () => {
    const content = 'Building on the previous argument, we can see that the logic follows.';
    expect(validateOutput(content, AGENT_ID, 2)).toBeNull();
  });

  it('accepts response with "in response to" pattern in round 2', () => {
    const content = 'In response to the argument above, I would counter that the data is ambiguous.';
    expect(validateOutput(content, AGENT_ID, 2)).toBeNull();
  });

  it('accepts response with "colleague" pattern in round 3', () => {
    const content = 'My colleague raised an excellent point about scalability constraints.';
    expect(validateOutput(content, AGENT_ID, 3)).toBeNull();
  });

  it('accepts response with "disagree" pattern in round 2', () => {
    const content = 'I disagree with the proposed solution because the trade-offs are unclear.';
    expect(validateOutput(content, AGENT_ID, 2)).toBeNull();
  });
});

describe('validateOutput — priority ordering', () => {
  it('empty_response takes priority over too_short', () => {
    // "[...]" matches empty content pattern and is also short
    expect(validateOutput('[x]', AGENT_ID, 1)).toBe('empty_response');
  });

  it('too_short takes priority over refusal (short refusals)', () => {
    // "I can't." is 8 chars — too_short fires first
    expect(validateOutput("I can't.", AGENT_ID, 1)).toBe('too_short');
  });
});
