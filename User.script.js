```javascript
// ==UserScript==
// @name         Zing Music Player FIX
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  Fix tìm kiếm nhạc Zing
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      zingmp3.vn
// @connect      ac.zingmp3.vn
// ==/UserScript==

(function () {
'use strict';

if (document.getElementById('ym-root')) return;

GM_addStyle(`
#ym-root{
position:fixed;
bottom:20px;
right:20px;
z-index:999999;
font-family:Arial;
}

#ym-box{
width:320px;
height:500px;
background:#fff;
border-radius:20px;
overflow:hidden;
box-shadow:0 10px 30px rgba(0,0,0,.3);
display:flex;
flex-direction:column;
}

#ym-thumb{
width:100%;
height:180px;
object-fit:cover;
background:#111;
}

#ym-body{
flex:1;
padding:15px;
text-align:center;
}

#ym-title{
font-size:15px;
font-weight:bold;
}

#ym-artist{
font-size:13px;
color:#888;
margin-top:5px;
}

#ym-status{
font-size:12px;
color:#999;
margin-top:10px;
}

#ym-play{
margin-top:20px;
width:60px;
height:60px;
border:none;
border-radius:50%;
background:#1eb6a7;
color:#fff;
font-size:24px;
cursor:pointer;
}

#ym-search-btn{
width:100%;
padding:12px;
border:none;
cursor:pointer;
font-weight:bold;
}

#ym-search{
position:absolute;
inset:0;
background:#fff;
display:none;
flex-direction:column;
}

#ym-search.open{
display:flex;
}

#ym-top{
padding:10px;
background:#1eb6a7;
display:flex;
gap:8px;
}

#ym-input{
flex:1;
padding:10px;
border:none;
border-radius:10px;
outline:none;
}

#ym-close{
border:none;
background:none;
color:#fff;
font-size:18px;
cursor:pointer;
}

#ym-list{
flex:1;
overflow:auto;
list-style:none;
padding:0;
margin:0;
}

.ym-item{
display:flex;
gap:10px;
padding:10px;
border-bottom:1px solid #eee;
cursor:pointer;
align-items:center;
}

.ym-item img{
width:50px;
height:50px;
border-radius:8px;
object-fit:cover;
}

.ym-item:hover{
background:#f5f5f5;
}
`);

const root=document.createElement('div');

root.id='ym-root';

root.innerHTML=`
<div id="ym-box">

<img id="ym-thumb" src="https://i.imgur.com/8Km9tLL.jpg">

<div id="ym-body">
<div id="ym-title">Chưa chọn bài hát</div>
<div id="ym-artist">—</div>
<div id="ym-status">Tìm bài hát để phát</div>

<button id="ym-play">▶</button>
</div>

<button id="ym-search-btn">🔍 Tìm bài hát</button>

<div id="ym-search">

<div id="ym-top">
<input id="ym-input" placeholder="Nhập tên bài hát...">
<button id="ym-close">✖</button>
</div>

<ul id="ym-list">
<li style="padding:20px;text-align:center;color:#999;">
Nhập tên bài hát rồi Enter
</li>
</ul>

</div>

</div>
`;

document.body.appendChild(root);

const audio=new Audio();

const titleEl=document.getElementById('ym-title');
const artistEl=document.getElementById('ym-artist');
const statusEl=document.getElementById('ym-status');
const thumbEl=document.getElementById('ym-thumb');

const playBtn=document.getElementById('ym-play');

const search=document.getElementById('ym-search');
const input=document.getElementById('ym-input');
const list=document.getElementById('ym-list');

function esc(s){
return String(s||'')
.replace(/&/g,'&amp;')
.replace(/</g,'&lt;')
.replace(/>/g,'&gt;');
}

function fmt(t){
if(!t)return'0:00';
const m=Math.floor(t/60);
const s=String(t%60).padStart(2,'0');
return m+':'+s;
}

function toggle(){
if(!audio.src)return;

if(audio.paused){
audio.play();
}else{
audio.pause();
}
}

playBtn.onclick=toggle;

audio.onplay=function(){
playBtn.textContent='⏸';
statusEl.textContent='Đang phát ♪';
};

audio.onpause=function(){
playBtn.textContent='▶';
};

audio.onerror=function(){
statusEl.textContent='Không phát được';
};

document.getElementById('ym-search-btn').onclick=function(){
search.classList.add('open');
input.focus();
};

document.getElementById('ym-close').onclick=function(){
search.classList.remove('open');
};

function searchSongs(q,cb){

GM_xmlhttpRequest({
method:'GET',

url:'https://ac.zingmp3.vn/v1/web/ac-suggestions?num=15&query='+encodeURIComponent(q),

headers:{
'User-Agent':'Mozilla/5.0',
'Accept':'application/json',
'Referer':'https://zingmp3.vn/'
},

onload:function(r){

try{

const json=JSON.parse(r.responseText);

if(
!json||
!json.data||
!json.data[0]||
!json.data[0].suggestions
){
cb([]);
return;
}

const songs=json.data[0].suggestions;

cb(songs.map(function(s){

return{
title:s.title||'Unknown',
artist:s.artists_names||'',
thumb:s.thumbnail||'',
id:s.id,
dur:fmt(s.duration||0)
};

}));

}catch(e){
console.error(e);
cb([]);
}

},

onerror:function(){
cb([]);
}

});

}

function load(song){

titleEl.textContent=song.title;
artistEl.textContent=song.artist;

if(song.thumb){
thumbEl.src=song.thumb;
}

statusEl.textContent='Đang lấy link...';

GM_xmlhttpRequest({
method:'GET',

url:'https://zingmp3.vn/api/v2/song/get/streaming?id='+song.id,

headers:{
'User-Agent':'Mozilla/5.0',
'Referer':'https://zingmp3.vn/'
},

onload:function(r){

try{

const json=JSON.parse(r.responseText);

if(!json.data){
statusEl.textContent='Không lấy được link';
return;
}

const url=
json.data['128']||
json.data['320'];

if(!url){
statusEl.textContent='Bài VIP hoặc lỗi';
return;
}

audio.src=url;

audio.play().catch(function(){
statusEl.textContent='Nhấn ▶ để phát';
});

}catch(e){
statusEl.textContent='Lỗi phát nhạc';
}

}

});

}

input.addEventListener('keypress',function(e){

if(e.key!=='Enter')return;

const q=this.value.trim();

if(!q)return;

list.innerHTML='<li style="padding:20px;text-align:center;">Đang tìm...</li>';

searchSongs(q,function(songs){

list.innerHTML='';

if(!songs.length){

list.innerHTML='<li style="padding:20px;text-align:center;color:#999;">Không tìm thấy</li>';

return;
}

songs.forEach(function(s){

const li=document.createElement('li');

li.className='ym-item';

li.innerHTML=
'<img src="'+esc(s.thumb)+'">'+
'<div>'+
'<div style="font-weight:bold;font-size:13px;">'+esc(s.title)+'</div>'+
'<div style="font-size:11px;color:#999;margin-top:3px;">'+esc(s.artist)+' · '+s.dur+'</div>'+
'</div>';

li.onclick=function(){

load(s);

search.classList.remove('open');

};

list.appendChild(li);

});

});

});

})();
```
