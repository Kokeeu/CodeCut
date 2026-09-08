import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  clampCollaborativeTotal,
  formatCollaborativeTotal,
  getCollaborativeTotal,
} from './collaborativeRanking.js';

const participants = [
  { id: 'ana' },
  { id: 'mateo' },
];

test('the collaborative total automatically sums participant scores above ten', () => {
  const scores = { ana: '7.5', mateo: '8.0' };
  assert.equal(getCollaborativeTotal(participants, scores), 15.5);
  assert.equal(formatCollaborativeTotal(participants, scores), '15.5');
});

test('the collaborative total keeps every individual score between zero and ten', () => {
  const scores = { ana: '15', mateo: '-2' };
  assert.equal(getCollaborativeTotal(participants, scores), 10);
  assert.equal(formatCollaborativeTotal(participants, scores), '10.0');
});

test('the collaborative total ignores scores from participants no longer present', () => {
  const scores = { ana: '7.5', mateo: '8.0', removed: '10.0' };
  assert.equal(getCollaborativeTotal(participants, scores), 15.5);
});

test('a manual total overrides the automatic sum and stays within the dynamic maximum', () => {
  const scores = { ana: '7.5', mateo: '8.0' };
  assert.equal(formatCollaborativeTotal(participants, scores, '18.2'), '18.2');
  assert.equal(formatCollaborativeTotal(participants, scores, '25'), '20.0');
  assert.equal(clampCollaborativeTotal('25', participants.length), 20);
});

test('clearing the manual total restores the automatic sum', () => {
  const scores = { ana: '7.5', mateo: '8.0' };
  assert.equal(formatCollaborativeTotal(participants, scores, null), '15.5');
  assert.equal(formatCollaborativeTotal(participants, scores, ''), '15.5');
});
