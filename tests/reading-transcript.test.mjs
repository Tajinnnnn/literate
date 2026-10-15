import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTranscriptLines, findActiveLine, audioWordIndex } from '../src/shared/readingTranscript.mjs';
import { playerSource } from '../src/shared/playerSource.mjs';

test('sentences preserve original word indices and paragraph boundaries', () => {
 const words='First sentence. Another follows without punctuation New paragraph here.'.split(' ');
 const lines=buildTranscriptLines(words,[0,6]);
 assert.deepEqual(lines.map(l=>[l.startWord,l.endWord,l.text]),[[0,2,'First sentence.'],[2,6,'Another follows without punctuation'],[6,9,'New paragraph here.']]);
 assert.equal(findActiveLine(lines,2),1);
 assert.equal(findActiveLine(lines,8),2);
 assert.equal(findActiveLine(lines,-1),-1);
});
test('long sentences are split into readable lines without losing words', () => {
 const words=Array.from({length:47},(_,i)=>'word'+i);
 const lines=buildTranscriptLines(words,[0]);
 assert.ok(lines.every(l=>l.endWord-l.startWord<=18));
 assert.equal(lines.map(l=>l.text).join(' '),words.join(' '));
 assert.equal(lines.at(-1).endWord,47);
});
test('empty reading sessions have no active line',()=>{
 assert.deepEqual(buildTranscriptLines([],[]),[]);
 assert.equal(findActiveLine([],0),-1);
});
test('playback position advances from the audio clock without animation frames',()=>{
 const chunk={indexBase:20,thresholds:[0,.25,.8,1.5]};
 assert.equal(audioWordIndex(chunk,12.9,12,false,20),22);
 assert.equal(audioWordIndex(chunk,14,12,false,20),23);
});
test('paused and unstarted audio retain their position',()=>{
 assert.equal(audioWordIndex({indexBase:20,thresholds:[0,.5]},20,12,true,20),20);
 assert.equal(audioWordIndex(null,20,12,false,-1),-1);
});
test('a detached player is bound to its explicit source tab',()=>{
 assert.deepEqual(playerSource('?mini=1&tabId=42'),{detached:true,tabId:42});
 assert.deepEqual(playerSource(''),{detached:false,tabId:null});
});
test('invalid detached sources cannot fall through to the active tab',()=>{
 for(const query of ['?mini=1','?mini=1&tabId=-2','?mini=1&tabId=other','?mini=1&tabId=0']) {
  assert.deepEqual(playerSource(query),{detached:true,tabId:null});
 }
});
