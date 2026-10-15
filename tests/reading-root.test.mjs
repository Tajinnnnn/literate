import {test} from 'node:test';
import assert from 'node:assert/strict';
import {selectReadingRoot,isRelatedSection} from '../src/shared/readingRoot.mjs';
function element(text, links=''){return {textContent:text,querySelectorAll:selector=>selector==='a'?[{textContent:links}]:[]};}
function doc(map){return {body:element('page'),querySelectorAll:selector=>map[selector]||[]};}
test('article body wins over main containing related stories',()=>{
 const body=element('Actual story '.repeat(40));const main=element('Story with related articles '.repeat(80));
 assert.equal(selectReadingRoot(doc({'[itemprop="articleBody"]':[body],'article':[],'main, [role="main"]':[main]})),body);
});
test('long prose article wins over short related article cards',()=>{
 const story=element('Narrative words. '.repeat(100));const card=element('Related title','Related title');
 assert.equal(selectReadingRoot(doc({'article':[card,story]})),story);
});
test('pages without articles retain main/body fallback',()=>{
 const main=element('Application page content');assert.equal(selectReadingRoot(doc({'main, [role="main"]':[main]})),main);
 const page=doc({});assert.equal(selectReadingRoot(page),page.body);
});
test('related-story widgets are excluded without excluding article discussion of related work',()=>{
 const node=(id,className)=>({id,className});
 for(const name of ['related-articles','related_posts','recommended-stories','article-recommendations'])assert.equal(isRelatedSection(node('',name)),true,name);
 for(const name of ['related-work','article-body','content','correlated-results'])assert.equal(isRelatedSection(node('',name)),false,name);
});
