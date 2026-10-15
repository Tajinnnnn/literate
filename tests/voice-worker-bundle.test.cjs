const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const vm=require('node:vm');const webpack=require('webpack');
test('actual worker entry starts without a document or extension APIs',async()=>{
 const config=require('../webpack.config');const dir=fs.mkdtempSync(path.join(os.tmpdir(),'literate-model-worker-'));
 await new Promise((resolve,reject)=>webpack({mode:'development',devtool:false,entry:{voiceWorker:config.entry.voiceWorker},output:{path:dir,filename:'worker.js',publicPath:'/'},resolve:config.resolve},(error,stats)=>error||stats.hasErrors()?reject(error||new Error(stats.toString({all:false,errors:true}))):resolve()));
 const context=vm.createContext({console,URL,URLSearchParams,TextEncoder,TextDecoder,Blob,AbortController,WebAssembly,DecompressionStream,CompressionStream,ReadableStream,TransformStream,performance,setTimeout,clearTimeout,atob,btoa,navigator:{userAgent:'Chrome'},location:{href:'chrome-extension://test/worker.js',origin:'chrome-extension://test',toString(){return this.href;}}});context.self=context;
 vm.runInContext(fs.readFileSync(path.join(dir,'worker.js'),'utf8'),context);
 assert.equal(typeof context.onmessage,'function');
});
