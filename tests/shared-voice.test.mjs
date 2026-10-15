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
 const service=sharedVoiceService(async()=>({voices:{},async generate(text){calls++;concurrent++;max=Math.max(max,concurrent);await Promise.resolve();concurrent--;return text;}}));
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
