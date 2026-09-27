import test from 'node:test';
import assert from 'node:assert/strict';
import { parseVoiceQuery } from '../src/utils/voice.js';

test('parses a commodity price search with a district', () => {
  assert.deepEqual(parseVoiceQuery('Show wheat prices in Lucknow'), { type: 'market', params: { commodity: 'Wheat', district: 'Lucknow' } });
  assert.deepEqual(parseVoiceQuery('show wheat prices for Kanpur Nagar.'), { type: 'market', params: { commodity: 'Wheat', district: 'Kanpur Nagar' } });
});

test('recognises a state as a state filter', () => {
  assert.deepEqual(parseVoiceQuery('prices of tomato in Uttar Pradesh'), { type: 'market', params: { commodity: 'Tomato', state: 'Uttar Pradesh' } });
});

test('handles question phrasing without a place', () => {
  assert.deepEqual(parseVoiceQuery("What's the rice rate"), { type: 'market', params: { commodity: 'Rice' } });
  assert.deepEqual(parseVoiceQuery('what is the current onion price'), { type: 'market', params: { commodity: 'Onion' } });
});

test('opens pages by voice', () => {
  assert.equal(parseVoiceQuery('open my diary').to, '/farmer/diary');
  assert.equal(parseVoiceQuery('go to crop health').to, '/farmer/crop-health');
  assert.equal(parseVoiceQuery('show notifications').to, '/notifications');
  assert.equal(parseVoiceQuery('take me to the map').to, '/farmer/farm-map');
  assert.equal(parseVoiceQuery('open weather').to, '/farmer/weather');
});

test('returns null when nothing can be understood', () => {
  for (const s of ['', '   ', 'hello there', 'sing me a song', null, undefined]) assert.equal(parseVoiceQuery(s), null);
});
