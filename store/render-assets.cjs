const sharp=require(process.cwd()+'/node_modules/sharp');
const fs=require('node:fs/promises');
const out=process.cwd()+'/store/assets/';
(async()=>{
 for(const theme of ['dark','light']){
  const dark=theme==='dark';const bg=dark?'#101117':'#eeede7',fg=dark?'#f0f0f5':'#25332c',dim=dark?'#b4b7c7':'#69716b',accent=dark?'#9aa0ff':'#6765aa';
  const svg=`<svg width="1280" height="800" xmlns="http://www.w3.org/2000/svg"><rect width="1280" height="800" fill="${bg}"/><g font-family="Helvetica,Arial,sans-serif"><text x="80" y="120" fill="${accent}" font-size="20" font-weight="600">LITERATE</text><text x="80" y="260" fill="${fg}" font-size="52" font-weight="600">Read with</text><text x="80" y="325" fill="${fg}" font-size="52" font-weight="600">your ears.</text><text x="80" y="390" fill="${dim}" font-size="21">Articles. Selections. Local PDFs.</text><text x="80" y="480" fill="${fg}" font-size="22">Follow the words as you listen.</text><text x="80" y="522" fill="${dim}" font-size="19">Click a word to pick up from there.</text><text x="80" y="648" fill="${accent}" font-size="18">${dark?'Local voices · Compact player':'Light and dark · Your accent color'}</text></g></svg>`;
  const shot=await sharp('/private/tmp/literate-store-'+theme+'.png').extract({left:0,top:62,width:680,height:818}).resize(544).png().toBuffer();
  await sharp(Buffer.from(svg)).composite([{input:shot,left:656,top:72}]).removeAlpha().png().toFile(out+'screenshot-'+theme+'-1280x800.png');
 }
 const promo=Buffer.from(`<svg width="440" height="280" xmlns="http://www.w3.org/2000/svg"><rect width="440" height="280" fill="#181818"/><g font-family="Helvetica,Arial,sans-serif"><text x="32" y="70" fill="#9aa0ff" font-size="22" font-weight="600">Literate</text><text x="32" y="135" fill="#f3f3f3" font-size="33" font-weight="600">A little more room</text><text x="32" y="176" fill="#f3f3f3" font-size="33" font-weight="600">to read.</text><text x="32" y="232" fill="#b4b4b4" font-size="16">Your browser. Your voice. Your pace.</text></g></svg>`);
 await sharp(promo).removeAlpha().png().toFile(out+'promo-440x280.png');
 await sharp('src/assets/img/logo.svg').resize(96,96).extend({top:16,bottom:16,left:16,right:16,background:{r:0,g:0,b:0,alpha:0}}).png().toFile(out+'store-icon-128.png');
 for(const name of await fs.readdir(out)){const m=await sharp(out+name).metadata();console.log(name,m.width,m.height);}
})().catch(e=>{console.error(e);process.exitCode=1});
