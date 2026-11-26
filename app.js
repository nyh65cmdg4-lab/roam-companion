const $=id=>document.getElementById(id);
let coord=[35.6812,139.7671],route=[],speed=4,mode="Walk",running=false,timer=null,index=0,marker,poly;
const map=L.map('map').setView(coord,15);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(map);
marker=L.marker(coord).addTo(map).bindPopup('アプリ内シミュレーション位置');
poly=L.polyline([],{color:'#00bcd4',weight:5}).addTo(map);
const load=k=>JSON.parse(localStorage.getItem(k)||'[]'),store=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
function say(s){$('status').textContent=s}
function update(){marker.setLatLng(coord);$('coords').textContent=coord.map(x=>x.toFixed(5)).join(', ');poly.setLatLngs(route);$('pointCount').textContent=route.length;$('state').textContent=running?'● ACTIVE':'● IDLE';$('state').style.color=running?'#56e69b':'#9aabb8'}
function addPoint(c){route.push(c);coord=c;update();map.panTo(c);say('ルート地点を追加しました')}
map.on('click',e=>addPoint([e.latlng.lat,e.latlng.lng]));
$('speed').addEventListener('input',e=>{speed=+e.target.value;$('speedText').textContent=speed.toFixed(1)+' m/s'});
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab,.pane').forEach(x=>x.classList.remove('active'));b.classList.add('active');$(b.dataset.tab).classList.add('active');if(b.dataset.tab==='mapview')setTimeout(()=>map.invalidateSize(),100);renderSaved()});
document.querySelectorAll('.mode').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;document.querySelectorAll('.mode').forEach(x=>x.classList.toggle('selected',x===b));say('移動モード: '+mode)});
function move(dx,dy){const lat=coord[0]+dy*speed/111000,scale=Math.max(.15,Math.cos(coord[0]*Math.PI/180));coord=[lat,coord[1]+dx*speed/(111000*scale)];update();map.panTo(coord,{animate:false});say('アプリ内の座標を移動しました')}
const joy=$('joy');let drag=false,last=[0,0],raf;
joy.addEventListener('pointerdown',e=>{drag=true;last=[e.clientX,e.clientY];joy.setPointerCapture(e.pointerId)});
joy.addEventListener('pointermove',e=>{if(!drag)return;const r=joy.getBoundingClientRect(),dx=(e.clientX-r.left-r.width/2)/(r.width/2),dy=(e.clientY-r.top-r.height/2)/(r.height/2);if(Math.hypot(dx,dy)>.15)move(Math.max(-1,Math.min(1,dx)),Math.max(-1,Math.min(1,-dy)))});
['pointerup','pointercancel'].forEach(ev=>joy.addEventListener(ev,()=>drag=false));
$('start').onclick=()=>{if(!route.length){say('先に地図をタップしてルート地点を追加してください');return}if(running)return;running=true;index=0;update();timer=setInterval(()=>{if(index>=route.length){stop();say('ルート再生が完了しました');return}coord=route[index++];update();map.panTo(coord)},Math.max(250,1000/(speed/4)))};
function stop(){running=false;clearInterval(timer);timer=null;update()}
$('stop').onclick=stop;
$('clearBtn').onclick=()=>{stop();route=[];update();say('ルートを消去しました')};
$('backMap').onclick=()=>document.querySelector('[data-tab="mapview"]').click();
$('saveBtn').onclick=()=>{const name=prompt('保存する場所の名前','お気に入り');if(!name)return;let a=load('rc_fav');a.unshift({name,coord});store('rc_fav',a);renderSaved();say('お気に入りに保存しました')};
$('recordBtn').onclick=()=>{let a=load('rc_hist');a.unshift({name:new Date().toLocaleString('ja-JP'),coord});store('rc_hist',a.slice(0,100));renderSaved();say('履歴に記録しました')};
function renderList(id,key){const a=load(key);$(id).innerHTML=a.length?'':'<p>まだ保存されていません</p>';a.forEach((v,i)=>{const d=document.createElement('div');d.className='item';const t=document.createElement('div');t.innerHTML='<b></b><small></small>';t.querySelector('b').textContent=v.name;t.querySelector('small').textContent=v.coord.map(x=>x.toFixed(5)).join(', ');const group=document.createElement('div');const use=document.createElement('button');use.textContent='表示';use.onclick=()=>{coord=v.coord;route=[coord];update();map.setView(coord,16);document.querySelector('[data-tab="mapview"]').click()};group.append(use);if(key==='rc_fav'){const del=document.createElement('button');del.textContent='削除';del.className='secondary';del.onclick=()=>{a.splice(i,1);store(key,a);renderSaved()};group.append(del)}d.append(t,group);$(id).append(d)})}
function renderSaved(){renderList('favorites','rc_fav');renderList('history','rc_hist')}
$('searchBtn').onclick=async()=>{const q=$('query').value.trim();if(!q)return;say('検索中…');try{const r=await fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&q='+encodeURIComponent(q));const a=await r.json();$('results').innerHTML='';a.forEach(v=>{const b=document.createElement('button');b.textContent=v.display_name.split(',').slice(0,2).join(',');b.onclick=()=>{coord=[+v.lat,+v.lon];route=[coord];update();map.setView(coord,16);$('results').innerHTML='';say('場所を選択しました')};$('results').append(b)});say(a.length?'検索結果を選択してください':'結果がありません')}catch(e){say('検索できませんでした。通信状態を確認してください')}};
$('locate').onclick=()=>{if(!navigator.geolocation){say('このブラウザは位置情報に対応していません');return}navigator.geolocation.getCurrentPosition(p=>{coord=[p.coords.latitude,p.coords.longitude];update();map.setView(coord,16);say('現在地を取得しました')},e=>say('位置情報を取得できません: '+e.message),{enableHighAccuracy:true,timeout:12000})};
$('importBtn').onclick=()=>$('gpxFile').click();
$('gpxFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;const xml=new DOMParser().parseFromString(await f.text(),'text/xml');const pts=[...xml.querySelectorAll('trkpt,rtept,wpt')].map(p=>[+p.getAttribute('lat'),+p.getAttribute('lon')]).filter(p=>Number.isFinite(p[0])&&Number.isFinite(p[1]));if(!pts.length){say('GPX内に地点が見つかりません');return}route=pts;coord=pts[0];update();map.setView(coord,15);say(pts.length+'地点を読み込みました')};
$('exportBtn').onclick=()=>{if(!route.length){say('書き出すルートがありません');return}const body=route.map(p=>`<trkpt lat="${p[0]}" lon="${p[1]}"></trkpt>`).join('');const xml=`<?xml version="1.0"?><gpx version="1.1" creator="Roam Companion" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>Roam route</name><trkseg>${body}</trkseg></trk></gpx>`;const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([xml],{type:'application/gpx+xml'}));a.download='roam-route.gpx';a.click();URL.revokeObjectURL(a.href)};
$('clearData').onclick=()=>{if(confirm('お気に入りと履歴をすべて削除しますか？')){localStorage.removeItem('rc_fav');localStorage.removeItem('rc_hist');renderSaved();say('保存データを削除しました')}};
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
update();renderSaved();