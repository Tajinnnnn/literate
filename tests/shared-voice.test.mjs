import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sharedVoiceService,encodeBytes,decodeAudio} from '../src/shared/sharedVoice.mjs';
import {voiceAudioBlob} from '../src/shared/voiceAudio.mjs';
test('different pages share one initialization and the same model identity',async()=>{
 let loads=0;const service=sharedVoiceService(async()=>{loads++;return {voices:{af_heart:{name:'Heart'}}};});
 const [a,b]=await Promise.all([service.ensure(),service.ensure()]);
 assert.equal(loads,1);assert.equal(a.instanceId,b.instanceId);assert.equal(service.status().loadCount,1);
 await service.ensure();assert.equal(loads,1);
});
test('inference is serialized across pages and identical audio is reused',async()=>{
 let concurrent=0,max=0,calls=0;
 const service=sharedVoiceService(async()=>({voices:{heart:{}},async generate(text){calls++;concurrent++;max=Math.max(max,concurrent);await Promise.resolve();concurrent--;return text;}}));
 const result=await Promise.all([service.generate('one','heart'),service.generate('two','heart'),service.generate('one','heart')]);
 assert.deepEqual(result,['one','two','one']);assert.equal(calls,2);assert.equal(max,1);
});
test('failed model loads can retry',async()=>{
 let calls=0;const service=sharedVoiceService(async()=>{if(!calls++)throw new Error('offline');return {voices:{}};});
 await assert.rejects(service.ensure(),/offline/);assert.equal(service.status().status,'error');await service.ensure();assert.equal(service.status().status,'ready');
});
test('compact audio survives Chrome JSON messaging',async()=>{
 const samples=new Float32Array([-.5,0,.5]);const encoded=encodeBytes(await voiceAudioBlob(samples,24000).arrayBuffer());
 const result=decodeAudio(JSON.parse(JSON.stringify({encoded})).encoded);
 assert.equal(result.sampling_rate,24000);assert.equal(result.audio.length,3);assert.ok(Math.abs(result.audio[2]-.5)<.0001);
});
test('unknown model voices cannot trigger arbitrary voice-file downloads', async () => {
 let generated = 0;
 const service = sharedVoiceService(async () => ({ voices: { af_heart: {} }, generate() { generated++; } }));
 await assert.rejects(service.generate('hello', '../../config'), /voice/i);
 assert.equal(generated, 0);
});
test('slow inference cannot build an unbounded work queue across pages', async () => {
 let release;
 const wait = new Promise(resolve => { release = resolve; });
 const service = sharedVoiceService(async () => ({ voices: { af_heart: {} }, generate: async text => { await wait; return text; } }));
 const jobs = Array.from({ length: 16 }, (_, i) => service.generate('sentence ' + i, 'af_heart'));
 await new Promise(resolve => setImmediate(resolve));
 let rejection;
 const overflow = service.generate('overflow', 'af_heart').catch(error => { rejection = error; });
 await new Promise(resolve => setImmediate(resolve));
 try { assert.match(rejection?.message || '', /busy|queue/i); }
 finally { release(); await Promise.all([...jobs, overflow]); }
 assert.equal(await service.generate('retry', 'af_heart'), 'retry');
});
