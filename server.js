const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

const PORT = Number(process.env.PORT || 3000);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const POSTS_FILE = path.join(DATA_DIR, 'posts.json');
if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 12) {
  console.error('Set ADMIN_PASSWORD to a strong password of at least 12 characters in your hosting environment.');
  process.exit(1);
}
fs.mkdirSync(DATA_DIR, {recursive:true});
if (!fs.existsSync(POSTS_FILE)) fs.writeFileSync(POSTS_FILE, '[]');
const tokens = new Map();
const FEEDS = [
  {name:'Google News India',url:'https://news.google.com/rss?hl=hi&gl=IN&ceid=IN:hi',category:'India'},
  {name:'Google News Politics',url:'https://news.google.com/rss/search?q=India+politics&hl=en-IN&gl=IN&ceid=IN:en',category:'Politics'},
  {name:'Google News Viral',url:'https://news.google.com/rss/search?q=India+viral+trending&hl=en-IN&gl=IN&ceid=IN:en',category:'Viral'},
  {name:'Google News Entertainment',url:'https://news.google.com/rss/search?q=India+entertainment&hl=en-IN&gl=IN&ceid=IN:en',category:'Entertainment'},
  {name:'Google News Sports',url:'https://news.google.com/rss/search?q=India+sports&hl=en-IN&gl=IN&ceid=IN:en',category:'Sports'}
];
function readPosts(){try{return JSON.parse(fs.readFileSync(POSTS_FILE,'utf8'))}catch{return []}}
function writePosts(p){fs.writeFileSync(POSTS_FILE,JSON.stringify(p,null,2))}
function send(res,status,obj,headers={}){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});res.end(JSON.stringify(obj))}
function body(req){return new Promise((resolve,reject)=>{let s='';req.on('data',c=>{s+=c;if(s.length>1e6)reject(new Error('Request too large'))});req.on('end',()=>{try{resolve(JSON.parse(s||'{}'))}catch{reject(new Error('Invalid JSON'))}});req.on('error',reject)})}
function decodeXml(s=''){return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).trim()}
function tag(xml,name){const m=xml.match(new RegExp('<'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+name+'>','i'));return m?m[1]:''}
async function getFeed(feed){try{const r=await fetch(feed.url,{headers:{'User-Agent':'ViralIndia24/1.0 news reader'},signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('HTTP '+r.status);const xml=await r.text();return [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].slice(0,12).map(m=>{let x=m[1],link=decodeXml(tag(x,'link'));if(!link){let lm=x.match(/<link[^>]*href=["']([^"']+)/i);if(lm)link=decodeXml(lm[1])}return {id:crypto.createHash('sha1').update(link||tag(x,'title')).digest('hex'),title:decodeXml(tag(x,'title')),summary:decodeXml(tag(x,'description')).slice(0,400),url:link,source:feed.name,category:feed.category,time:decodeXml(tag(x,'pubDate'))}}).filter(x=>x.title&&x.url)}catch(e){console.error('Feed failed:',feed.name,e.message);return []}}
async function handler(req,res){
 const url=new URL(req.url,'http://localhost');
 if(req.method==='GET'&&url.pathname==='/api/health')return send(res,200,{ok:true});
 if(req.method==='GET'&&url.pathname==='/api/news'){
   const results=await Promise.all(FEEDS.map(getFeed));const seen=new Set();const items=results.flat().filter(n=>{if(seen.has(n.url))return false;seen.add(n.url);return true}).sort((a,b)=>new Date(b.time||0)-new Date(a.time||0));
   return send(res,200,{items,updatedAt:new Date().toISOString(),note:'Headlines are sourced from RSS. Follow source links and verify claims.'},{'Cache-Control':'public, max-age=180'});
 }
 if(req.method==='GET'&&url.pathname==='/api/posts')return send(res,200,{items:readPosts()});
 if(req.method==='POST'&&url.pathname==='/api/admin/login'){
   try{const b=await body(req);const supplied=Buffer.from(String(b.password||''));const expected=Buffer.from(ADMIN_PASSWORD);if(supplied.length!==expected.length||!crypto.timingSafeEqual(supplied,expected))return send(res,401,{error:'Incorrect password'});const t=crypto.randomBytes(32).toString('hex');tokens.set(t,Date.now()+8*60*60*1000);return send(res,200,{token:t})}catch(e){return send(res,400,{error:e.message})}
 }
 const auth=(req)=>{const m=(req.headers.authorization||'').match(/^Bearer (.+)$/);if(!m)return false;const expiry=tokens.get(m[1]);if(!expiry||expiry<Date.now()){tokens.delete(m[1]);return false}return true};
 if(req.method==='POST'&&url.pathname==='/api/posts'){
   if(!auth(req))return send(res,401,{error:'Please log in again'});try{const b=await body(req);const title=String(b.title||'').trim(),summary=String(b.summary||'').trim();if(!title||!summary)return send(res,400,{error:'Headline and summary are required'});const allowed=['Viral','Politics','India','Entertainment','Sports','Fact Check','World'];const posts=readPosts();const p={id:crypto.randomUUID(),title:title.slice(0,180),summary:summary.slice(0,1200),category:allowed.includes(b.category)?b.category:'Viral',source:String(b.source||'').slice(0,300),emoji:String(b.emoji||'📰').slice(0,8),time:new Date().toISOString()};posts.unshift(p);writePosts(posts);return send(res,201,{item:p})}catch(e){return send(res,400,{error:e.message})}
 }
 if(req.method==='DELETE'&&url.pathname.startsWith('/api/posts/')){
   if(!auth(req))return send(res,401,{error:'Please log in again'});const id=decodeURIComponent(url.pathname.slice('/api/posts/'.length));const posts=readPosts();writePosts(posts.filter(p=>p.id!==id));return send(res,200,{ok:true})
 }
 if(req.method==='GET'){
   const requested=url.pathname==='/'?'/index.html':url.pathname;const file=path.join(__dirname,path.normalize(requested).replace(/^(\.\.[/\\])+/,''));if(!file.startsWith(__dirname))return send(res,403,{error:'Forbidden'});fs.readFile(file,(err,data)=>{if(err){res.writeHead(404,{'Content-Type':'text/plain'});return res.end('Not found')}const ext=path.extname(file);const type=ext==='.html'?'text/html; charset=utf-8':ext==='.css'?'text/css':ext==='.js'?'text/javascript':'application/octet-stream';res.writeHead(200,{'Content-Type':type,'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'});res.end(data)});return
 }
 send(res,404,{error:'Not found'});
}
http.createServer((req,res)=>handler(req,res).catch(e=>{console.error(e);send(res,500,{error:'Server error'})})).listen(PORT,()=>console.log(`Viral India 24 running on port ${PORT}`));
