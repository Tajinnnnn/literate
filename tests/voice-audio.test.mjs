import {test} from 'node:test';
import assert from 'node:assert/strict';
import {voiceAudioBlob,firstChunkEnd} from '../src/shared/voiceAudio.mjs';
test('PCM audio preserves sample rate, signed peaks and WAV length',async()=>{
 const blob=voiceAudioBlob(new Float32Array([-1,0,1,2]),24000);const data=new DataView(await blob.arrayBuffer());
 assert.equal(blob.type,'audio/wav');assert.equal(blob.size,52);assert.equal(data.getUint32(24,true),24000);assert.equal(data.getUint32(40,true),8);
 assert.equal(data.getInt16(44,true),-32768);assert.equal(data.getInt16(46,true),0);assert.equal(data.getInt16(48,true),32767);assert.equal(data.getInt16(50,true),32767);
});
test('first audio ends at a short sentence instead of rendering the whole page',()=>{
 const words='A simpler day. This is a longer second sentence.'.split(' ');
 assert.equal(firstChunkEnd(words,0),3);assert.equal(firstChunkEnd(words,3),words.length);
 assert.equal(firstChunkEnd(['hello','world','again'],0,8),1);
 assert.equal(firstChunkEnd(['a'.repeat(150),'next'],0),1);
});
