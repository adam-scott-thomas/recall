import { describe, it, expect } from 'vitest';
import { createClassifier, classify } from '../src/core/classifier.js';

describe('TF-IDF Classifier', () => {
  const clf = createClassifier();

  it('classifies security-related text as security', () => {
    const results = classify(clf, 'We need to add authentication and fix the vulnerability in the TLS certificate handling');
    expect(results[0][0]).toBe('security');
    expect(results[0][1]).toBeGreaterThan(0);
  });

  it('classifies coding text as software', () => {
    const results = classify(clf, 'I refactored the function and added unit tests for the API endpoint bug fix');
    expect(results[0][0]).toBe('software');
  });

  it('classifies business text as business', () => {
    const results = classify(clf, 'Our revenue strategy and investor pitch deck need updating before the fundraising round');
    expect(results[0][0]).toBe('business');
  });

  it('returns top 3 by default', () => {
    const results = classify(clf, 'The machine learning model training pipeline needs security review for our product launch');
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it('scores are between 0 and 1', () => {
    const results = classify(clf, 'hello world');
    for (const [, score] of results) {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    }
  });
});
