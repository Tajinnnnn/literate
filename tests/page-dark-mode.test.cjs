const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const path=require('node:path');const babel=require('@babel/core');
const {code}=babel.transformFileSync(path.join(__dirname,'../src/pages/Content/modules/darkMode.js'),{babelrc:false,configFile:false,plugins:[require.resolve('@babel/plugin-transform-modules-commonjs')]});
function element(attrs=[],background='rgb(255, 255, 255)',color='rgb(50, 50, 50)'){
 const values=new Map(),priorities=new Map();const style={getPropertyValue:k=>values.get(k)||'',getPropertyPriority:k=>priorities.get(k)||'',setProperty(k,v,p=''){values.set(k,v);priorities.set(k,p);},removeProperty(k){values.delete(k);priorities.delete(k);}};
 for(const [key,css]of [['backgroundColor','background-color'],['color','color']])Object.defineProperty(style,key,{get:()=>style.getPropertyValue(css),set:v=>style.setProperty(css,v)});
 const classes=new Set();return {nodeType:1,tagName:'DIV',style,background,color,hasAttribute:k=>attrs.includes(k),closest:selector=>attrs.includes(selector.slice(1,-1))?{}:null,classList:{contains:k=>classes.has(k),add:k=>classes.add(k),remove:k=>classes.delete(k)},querySelectorAll:()=>[]};
}
function setup(children){
 const root=element();root.querySelectorAll=()=>children;let storageChanged;
 const exports={};vm.runInNewContext(code,{exports,Node:{ELEMENT_NODE:1},MutationObserver:class{observe(){}disconnect(){}},document:{documentElement:root},window:{getComputedStyle:el=>({backgroundColor:el.style.backgroundColor||el.background,color:el.style.color||el.color})},chrome:{storage:{sync:{get(keys,cb){cb({});},set(){}},onChanged:{addListener(fn){storageChanged=fn;}}}}});
 return {...exports,changed:(changes)=>storageChanged?.(changes,'sync')};
}
test('PDF labels excluded from narration still receive readable dark colors',()=>{
 const label=element(['data-ttsxr-ignore'],'rgba(0, 0, 0, 0)','rgb(102, 102, 102)');const mode=setup([label]);mode.toggleDarkMode();assert.notEqual(label.style.color,'');
});
test('leaving dark mode restores original inline values and important priorities',()=>{
 const panel=element();panel.style.setProperty('background-color','rgb(255, 255, 255)','important');panel.style.setProperty('color','rgb(50, 50, 50)','important');
 const mode=setup([panel]);mode.toggleDarkMode();mode.toggleDarkMode();assert.equal(panel.style.backgroundColor,'rgb(255, 255, 255)');assert.equal(panel.style.getPropertyPriority('background-color'),'important');assert.equal(panel.style.getPropertyPriority('color'),'important');
});
test('page appearance follows changes made in another reading tab',()=>{
 const mode=setup([]);mode.initDarkMode();mode.changed({ttsDarkMode:{newValue:true}});assert.equal(mode.isDarkModeActive(),true);mode.changed({ttsDarkMode:{newValue:false}});assert.equal(mode.isDarkModeActive(),false);
});
test('Literate controls remain untouched and empty original styles are restored',()=>{
 const control=element(['data-ttsxr-ignore','data-ttsxr-theme-ignore']);const paragraph=element();const mode=setup([control,paragraph]);
 mode.toggleDarkMode();assert.equal(control.style.color,'');assert.notEqual(paragraph.style.color,'');mode.toggleDarkMode();assert.equal(paragraph.style.color,'');assert.equal(paragraph.style.backgroundColor,'');
});
