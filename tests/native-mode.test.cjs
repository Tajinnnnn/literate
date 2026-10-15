const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const path=require('node:path');const babel=require('@babel/core');
function compiled(file){return babel.transformFileSync(path.join(__dirname,'../src/',file),{babelrc:false,configFile:false,plugins:[require.resolve('@babel/plugin-transform-modules-commonjs')]}).code;}
test('saved device mode never warms Kokoro on page or popup load',async()=>{
 let listener,loads=0;const exports={};
 class System {getState(){return {active:false};}getVoices(){return [];}stop(){}}
 class Natural extends System {ensureModelLoaded(){loads++;return Promise.resolve();}getNaturalVoiceMeta(){return {status:'idle'};}}
 const MSG={GET_STATE:'state'};
 vm.runInNewContext(compiled('shared/readerBootstrap.js'),{exports,Date,Math,Promise,setTimeout,document:{addEventListener(){},title:'Test'},window:{location:{hostname:'test'}},chrome:{runtime:{onMessage:{addListener(fn){listener=fn;}}},storage:{sync:{get(keys,cb){cb({ttsNaturalVoiceEnabled:false});},set(){}},onChanged:{addListener(){}}}},require(id){if(id.endsWith('naturalVoiceEngine'))return {NaturalVoiceEngine:Natural};if(id.endsWith('ttsEngine'))return {TTSEngine:System};if(id.endsWith('darkMode'))return {initDarkMode(){},isDarkModeActive(){return false;}};if(id.endsWith('messages'))return {MSG,DEFAULT_HOTKEYS:{}};return {};}});
 exports.initReadingSurface();
 const result=await new Promise(resolve=>listener({type:MSG.GET_STATE},{},resolve));
 assert.equal(result.naturalVoiceEnabled,false);assert.equal(loads,0);
});

function nativeEngine(){
 const exports={};const voices=[{name:'Samantha',lang:'en-US',voiceURI:'local',localService:true,default:true},{name:'Google English',lang:'en-US',voiceURI:'remote',localService:false},{name:'Boing',lang:'en-US',voiceURI:'novelty',localService:true}];
 vm.runInNewContext(compiled('pages/Content/modules/ttsEngine.js'),{exports,window:{speechSynthesis:{getVoices:()=>voices,addEventListener(){},cancel(){}}},chrome:{storage:{sync:{get(keys,cb){cb({});},set(){}}}},require(id){if(id.endsWith('hoverToolbar'))return {HoverToolbar:class {show(){}hide(){}refresh(){}}};if(id.endsWith('wordWrapper'))return {unwrapWords(){}};if(id.endsWith('readingTranscript.mjs'))return require('../src/shared/readingTranscript.mjs');return {};}});
 return new exports.TTSEngine();
}
test('device mode offers local voices and never resolves a cloud or novelty voice',()=>{
 const engine=nativeEngine();assert.equal(engine.getVoices().length,1);
 engine.voiceURI='remote';assert.equal(engine._resolveVoice().voiceURI,'local');
});
test('device mode retains clickable transcript and completion state',()=>{
 const engine=nativeEngine();let start;
 engine._speakFrom=index=>{start=index;};
 engine._beginReading({words:['Hello','world.'],spans:[],boundaries:[0]});
 const session=engine.getState().sessionId;
 assert.equal(engine.getTranscript().wordCount,2);
 engine._jumpTo=index=>{start=index;};
 assert.equal(engine.seekToWord(1,session).ok,true);assert.equal(start,1);
 engine.stop({completed:true});assert.equal(engine.getState().completed,true);assert.equal(engine.getState().wordCount,2);
 assert.equal(engine.seekToWord(0,session).ok,true);assert.equal(start,0);
 assert.equal(engine.seekToWord(1,session).ok,false);
});
