const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');
const { code } = babel.transformFileSync(path.join(__dirname, '../src/pages/Content/modules/naturalVoiceEngine.js'), { babelrc: false, configFile: false, plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')] });
const exportsObject = {};
class FakeAudio { play() { return Promise.resolve(); } pause() {} removeAttribute() {} load() {} }
vm.runInNewContext(code, { Audio: FakeAudio, URL: {createObjectURL: () => 'blob:test', revokeObjectURL() {}}, requestAnimationFrame: () => 1, cancelAnimationFrame() {}, chrome: {storage:{sync:{set(){}}}}, exports: exportsObject, require(id) {
  if (id.endsWith('wordWrapper')) return { wrapPageWords: () => ({ words: ['article'], spans: [] }), wrapElementWords: root => ({ words: [root.label], spans: [] }) };
  if (id.endsWith('voiceAudio.mjs')) return require('../src/shared/voiceAudio.mjs');
  if (id.endsWith('readingTranscript.mjs')) return require('../src/shared/readingTranscript.mjs');
  return {};
} });
const Engine = exportsObject.NaturalVoiceEngine;

function engineState() {
 const engine = Object.create(Engine.prototype);
 Object.assign(engine, { active: true, _paused: false, audioContext: null, toolbar: { refresh() {} }, transcript: { wordCount: 40, sessionId: 1 }, completed: false, currentIndex: 20, currentSpan: null, spans: [], followLock: false });
 return engine;
}
test('pause during first synthesis is remembered before an AudioContext exists',()=>{
 const engine=engineState();engine.togglePause();assert.equal(engine.isPaused(),true);
});
test('GET_STATE follows the audio clock when page animation callbacks do not run',()=>{
 const engine=engineState();engine.audioContext={currentTime:12.9};engine._chunkStartContextTime=12;engine.currentChunk={indexBase:20,thresholds:[0,.25,.8,1.5]};
 assert.equal(engine.getState().currentIndex,22);
 engine._paused=true;engine.audioContext.currentTime=14;
 assert.equal(engine.getState().currentIndex,22);
});
test('seeking cancels the old audio clock and resumes at the selected word', async()=>{
 const engine=engineState();engine.words=Array.from({length:40},(_,i)=>`word${i}`);engine._paused=true;
 let restarted;engine._restartFrom=i=>{restarted=i;};
 const result=await engine.seekToWord(7,1);
 assert.equal(result.ok,true);assert.equal(restarted,7);assert.equal(engine.currentIndex,7);assert.equal(engine._paused,false);
});
test('seeking rejects stale sessions and invalid indices', async()=>{
 const engine=engineState();engine.words=Array(40).fill('word');
 for(const [index,session] of [[5,0],[-1,1],[40,1],[1.5,1]]) assert.equal((await engine.seekToWord(index,session)).ok,false);
});
test('completed narration can resume the same transcript from a clicked word', async()=>{
 const engine=engineState();engine.active=false;engine._sessionWords=['one','two','three'];engine._sessionBoundaries=[0];engine.transcript.wordCount=3;
 let restart;engine._beginReading=async(result,index)=>{restart={result,index};return {ok:true};};
 assert.equal((await engine.seekToWord(1,1)).ok,true);assert.equal(restart.index,1);assert.deepEqual(Array.from(restart.result.words),['one','two','three']);
});
test('restarting clears stale chunk timing before synthesis',()=>{
 const engine=engineState();engine._generation=2;engine.currentChunk={indexBase:20,thresholds:[0,.2]};engine._pendingNextChunk={};
 let target;engine._playFrom=index=>{target=index;};engine._restartFrom(5);
 assert.equal(engine.currentChunk,null);assert.equal(engine._pendingNextChunk,null);assert.equal(target,5);assert.equal(engine._generation,3);
});

test('speed changes update live audio immediately without resynthesizing',()=>{
 const engine=engineState();let restarts=0;engine._restartFromCurrent=()=>restarts++;engine.audioElement={playbackRate:1};
 engine.setRate(1.5);assert.equal(engine.audioElement.playbackRate,1.5);assert.equal(restarts,0);assert.equal(engine.rate,1.5);
});
test('media playback time drives the word index after a speed change',()=>{
 const engine=engineState();engine.audioElement={currentTime:.9};engine.currentChunk={indexBase:20,thresholds:[0,.25,.8,1.5]};
 assert.equal(engine.getState().currentIndex,22);
});

test('replaying the same words or changing speed reuses recent generated audio',async()=>{
 const engine=engineState();engine.words=['Hello','world.'];engine.voiceId='af_heart';let calls=0;
 engine.tts={generate:async()=>{calls++;return {audio:new Float32Array([0,.1]),sampling_rate:24000};}};
 await engine._synthesizeChunk(0,2);engine.rate=1.5;await engine._synthesizeChunk(0,2);assert.equal(calls,1);
 engine.voiceId='am_onyx';await engine._synthesizeChunk(0,2);assert.equal(calls,2);
});

test('a chosen section remains the reading scope on subsequent play',async()=>{
 const engine=engineState();engine.stop=()=>{};engine._beginReading=async result=>({ok:true,first:result.words[0]});
 const root={isConnected:true,label:'section'};
 assert.equal((await engine.startSection(root)).first,'section');assert.equal((await engine.start('page')).first,'section');
 root.isConnected=false;assert.equal((await engine.start('page')).first,'article');
});

test('slow continuation waits for the prefetched chunk and reports buffering',async()=>{
 const engine=engineState();Object.assign(engine,{words:'First sentence. Second sentence. Third sentence. Fourth sentence.'.split(' '),voiceId:'af_heart',rate:1,volume:1,_generation:1});
 const requests=[];let finish;
 engine.tts={generate:text=>{requests.push(text);return new Promise(resolve=>{finish=resolve;});}};
 engine._playChunk({indexBase:0,chunkEnd:2,audio:new Float32Array(24000),samplingRate:24000});
 const first=engine.audioElement;
 first.onended();
 assert.equal(engine.getState().isSynthesizing,true);
 assert.equal(requests.length,1,'the unfinished prefetch must be reused');
 finish({audio:new Float32Array(24000),sampling_rate:24000});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(requests.length,1);
 assert.equal(engine.currentChunk.indexBase,2);
 assert.equal(engine.currentChunk.chunkEnd,engine.words.length);
 assert.equal(engine.getState().isSynthesizing,false);
});

test('CPU continuation stays short so it can be prepared during playback',()=>{
 const engine=engineState();engine.executionBackend='wasm';engine.words='First sentence. Second sentence. Third sentence. Fourth sentence.'.split(' ');
 assert.equal(engine._findChunkEnd(2),4);
});
