import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reflowPdfText} from '../src/shared/pdfText.mjs';
const item=(str,x,y=100,width=str.length*5,extra={})=>({str,width,height:10,transform:[10,0,0,10,x,y],...extra});

test('joins individually positioned letters and font fragments without inventing spaces',()=>{
 assert.equal(reflowPdfText([item('r',0),item('e',5),item('ad',10),item('ing',20)]),'reading');
 assert.equal(reflowPdfText([item('read',0),item('ing',20,100,15,{fontName:'bold'}),item('.',35)]),'reading.');
});
test('preserves real word gaps, explicit spaces, punctuation, and kerning',()=>{
 assert.equal(reflowPdfText([item('Read',0),item('this',23),item('.',43)]),'Read this.');
 assert.equal(reflowPdfText([item('a',0),item(' ',5,100,0),item('book',5)]),'a book');
 assert.equal(reflowPdfText([item('A',0),item('V',4.8)]),'AV');
});
test('unwraps lines and keeps paragraph gaps and empty EOL markers',()=>{
 assert.equal(reflowPdfText([item('Read this',0),item('',0,88,0,{hasEOL:true}),item('next line.',0,88),item('New paragraph.',0,64)]),'Read this next line.\n\nNew paragraph.');
});
test('repairs discretionary hyphen wraps while preserving real compounds',()=>{
 assert.equal(reflowPdfText([item('read\u00ad',0,100,20,{hasEOL:true}),item('ing',0,88)]),'reading');
 assert.equal(reflowPdfText([item('well-',0,100,25,{hasEOL:true}),item('known',0,88)]),'well-known');
});
test('normalizes ligatures and invisible controls without merging separate words',()=>{
 assert.equal(reflowPdfText([item('ﬁne\u200b',0),item('words',40)]),'fine words');
 assert.equal(reflowPdfText([{str:'one'},{str:'two'}]),'one two');
 assert.equal(reflowPdfText([]),'');
});

test('repairs compact letter-spaced heading runs but preserves word boundaries and abbreviations',()=>{
 const tracked=(str,x,width)=>item(str,x,100,width,{height:8.2,transform:[8.2,0,0,8.2,x,100]});
 assert.equal(reflowPdfText([tracked('E T H O S',0,29.84),item(' ',29.84,100,10),tracked('O R D E R',37.38,29.84),item(' ',67.22,100,10),tracked('F L O W',74.76,23.61)]),'ETHOS ORDER FLOW');
 assert.equal(reflowPdfText([tracked('E D U C A T I O N',0,54.76)]),'EDUCATION');
 assert.equal(reflowPdfText([item('U S A',0,100,25)]),'U S A');
 assert.equal(reflowPdfText([item('A B C D',0,100,40)]),'A B C D');
 assert.equal(reflowPdfText([item('I am a reader',0)]),'I am a reader');
});
