const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const path=require('node:path');const babel=require('@babel/core');
const {code}=babel.transformFileSync(path.join(__dirname,'../src/pages/Background/voiceHost.js'),{babelrc:false,configFile:false,plugins:[require.resolve('@babel/plugin-transform-modules-commonjs')]});
test('concurrent page connections create one host and reuse it after routing restarts',async()=>{
 let creates=0,exists=false;const exports={};
 vm.runInNewContext(code,{exports,require(id){if(id.endsWith('security.mjs'))return require('../src/shared/security.mjs');return {};},chrome:{runtime:{getURL:p=>'chrome-extension://test/'+p,getContexts:async()=>exists?[{}]:[],onMessage:{addListener(){}}},offscreen:{async createDocument(){creates++;await Promise.resolve();exists=true;}}}});
 await Promise.all([exports.ensureVoiceHost(),exports.ensureVoiceHost(),exports.ensureVoiceHost()]);assert.equal(creates,1);
 await exports.ensureVoiceHost();assert.equal(creates,1);
});
