import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { compareVersions, needsForceUpdate } from '../src/lib/app-config-pure.ts';

describe('compareVersions', () => {
  it('membandingkan semver sederhana', () => {
    assert.equal(compareVersions('2.0.0', '2.0.0'), 0);
    assert.equal(compareVersions('2.0.1', '2.0.0'), 1);
    assert.equal(compareVersions('1.9.9', '2.0.0'), -1);
    assert.equal(compareVersions('2.0', '2.0.0'), 0);
  });
  it('force update bila di bawah minimum', () => {
    assert.equal(needsForceUpdate('1.0.0', { minSupportedVersion: '2.0.0' }), true);
    assert.equal(needsForceUpdate('2.0.0', { minSupportedVersion: '2.0.0' }), false);
  });
});
