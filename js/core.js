// Pure data functions. Coordinates are [longitude, latitude]; times are UTC milliseconds.
export const empty = () => ({type:'FeatureCollection',features:[]});
export const prop = (f,key) => {const p=f?.properties||{};return p[key]??p[key.toUpperCase()]??p[key.toLowerCase()];};
export function forecastHour(f){const v=prop(f,'tau')??prop(f,'TAU');return v==null?NaN:Number(v);}
const offsets={UTC:0,GMT:0,AST:-4,EDT:-4,EST:-5,CDT:-5,CST:-6,MDT:-6,MST:-7,PDT:-7,PST:-8,HST:-10};
export function advisoryTime(f){
 const raw=prop(f,'advdate');if(typeof raw==='number')return raw;
 const m=String(raw||'').match(/(\d{1,4})\s*(AM|PM)\s+(\w+)\s+\w+\s+(\w+)\s+(\d+)\s+(\d{4})/i);
 if(m){const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];const n=Number(m[1]);const h=(Math.floor(n/100)%12)+(m[2].toUpperCase()==='PM'?12:0);return Date.UTC(+m[6],months.indexOf(m[4]),+m[5],h-(offsets[m[3]]??0),n%100);}
 const parsed=Date.parse(raw);return Number.isFinite(parsed)?parsed:null;
}
export function validTime(f){
 const base=advisoryTime(f)??Number(prop(f,'idp_filedate'));const raw=String(prop(f,'validtime')||'');const m=raw.match(/^(\d{2})\/(\d{2})(\d{2})$/);
 if(m && Number.isFinite(base)){const b=new Date(base), candidates=[-1,0,1].map(i=>Date.UTC(b.getUTCFullYear(),b.getUTCMonth()+i,+m[1],+m[2],+m[3]));return candidates.sort((a,c)=>Math.abs(a-base)-Math.abs(c-base))[0];}
 const hour=forecastHour(f);return Number.isFinite(base)&&Number.isFinite(hour)?base+hour*3600000:null;
}
export function groupStorms(fc){
 const groups=new Map();for(const f of fc?.features||[]){if(f.geometry?.type!=='Point'||!f.geometry.coordinates.every(Number.isFinite))continue;const id=String(prop(f,'idp_subset')||String(prop(f,'idp_source')||'').split('-')[0]);if(!id)continue;if(!groups.has(id))groups.set(id,{id,points:[]});groups.get(id).points.push(f);}
 return [...groups.values()].map(s=>{s.points.sort((a,b)=>forecastHour(a)-forecastHour(b));s.current=s.points.find(f=>forecastHour(f)===0)||s.points[0];s.name=prop(s.current,'stormname')||s.id;return s;});
}
export function stormFeature(f,id){const s=String(prop(f,'idp_subset')||prop(f,'idp_source')||'');return s===id||s.startsWith(id+'-');}
export function distanceMiles(a,b){const r=Math.PI/180,dl=(b[0]-a[0])*r,dp=(b[1]-a[1])*r;const h=Math.sin(dp/2)**2+Math.cos(a[1]*r)*Math.cos(b[1]*r)*Math.sin(dl/2)**2;return 3958.7613*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));}
function lines(g){return g?.type==='LineString'?[g.coordinates]:g?.type==='MultiLineString'?g.coordinates:[];}
function intersect(a,b,c,d){const rx=b[0]-a[0],ry=b[1]-a[1],sx=d[0]-c[0],sy=d[1]-c[1],den=rx*sy-ry*sx;if(Math.abs(den)<1e-10)return null;const t=((c[0]-a[0])*sy-(c[1]-a[1])*sx)/den,u=((c[0]-a[0])*ry-(c[1]-a[1])*rx)/den;return t>=0&&t<=1&&u>=0&&u<=1?{point:[a[0]+t*rx,a[1]+t*ry],t}:null;}
function nearest(a,c,d){const dx=d[0]-c[0],dy=d[1]-c[1],l=dx*dx+dy*dy;const t=l?Math.max(0,Math.min(1,((a[0]-c[0])*dx+(a[1]-c[1])*dy)/l)):0;return [c[0]+t*dx,c[1]+t*dy];}
export function estimateApproach(points,coast){
 if(!points.length||!coast?.features?.length)return null;
 const segments=coast.features.flatMap(f=>lines(f.geometry)).flatMap(l=>l.slice(1).map((p,i)=>[l[i],p]));if(!segments.length)return null;
 for(let i=1;i<points.length;i++){const a=points[i-1].geometry.coordinates,b=points[i].geometry.coordinates;const hits=segments.map(([c,d])=>intersect(a,b,c,d)).filter(Boolean).sort((a,b)=>a.t-b.t);if(hits.length){const time=validTime(points[i]);return time?{kind:'landfall',point:hits[0].point,forecastPoint:b,time,hour:forecastHour(points[i])}:null;}}
 let best=null;for(const f of points){if(forecastHour(f)===0&&points.length>1)continue;const p=f.geometry.coordinates;for(const [c,d] of segments){const q=nearest(p,c,d),distance=distanceMiles(p,q);if(!best||distance<best.distance)best={kind:'closest',point:p,coastPoint:q,time:validTime(f),hour:forecastHour(f),distance};}}
 return best?.time?best:null;
}
function inRing(p,r){let yes=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
export function alertsAt(p,features){return features.filter(f=>{const g=f.geometry,polys=g?.type==='Polygon'?[g.coordinates]:g?.type==='MultiPolygon'?g.coordinates:[];return polys.some(poly=>inRing(p,poly[0])&&!poly.slice(1).some(r=>inRing(p,r)));});}
export function alertRelevant(event){return /^(Tornado|Severe Thunderstorm|Flash Flood|Flood|Coastal Flood|Storm Surge|Hurricane|Tropical Storm|Extreme Wind|High Wind|Special Marine|Severe Weather Statement)\b/.test(event||'');}
export const loudWarning=e=>/^(Tornado|Flash Flood|Extreme Wind|Hurricane|Storm Surge) Warning$/.test(e||'');
export function eventColor(e){if(/Tornado|Extreme Wind/.test(e))return '#ff4055';if(/Flash Flood|Flood|Coastal Flood/.test(e))return '#35da8a';if(/Hurricane|Storm Surge/.test(e))return '#ff6e37';if(/Tropical Storm|High Wind/.test(e))return '#ffce57';if(/Marine/.test(e))return '#48d4ef';return '#f6ad35';}
export function safeURL(value){try{const u=new URL(value);return u.protocol==='https:'?u.href:null;}catch{return null;}}
export function youtubeId(value){try{const u=new URL(value);let id;if(u.hostname==='youtu.be')id=u.pathname.slice(1).split('/')[0];else if(['youtube.com','www.youtube.com','m.youtube.com'].includes(u.hostname))id=u.searchParams.get('v')||(/^\/(shorts|live)\//.test(u.pathname)?u.pathname.split('/')[2]:null);return /^[\w-]{11}$/.test(id||'')?id:null;}catch{return null;}}
export function boundsOf(features){const pts=[];function walk(c){if(typeof c?.[0]==='number')pts.push(c);else c?.forEach(walk);}features.forEach(f=>walk(f.geometry?.coordinates));return pts.length?pts.reduce((b,p)=>[[Math.min(b[0][0],p[0]),Math.min(b[0][1],p[1])],[Math.max(b[1][0],p[0]),Math.max(b[1][1],p[1])]],[[180,90],[-180,-90]]):null;}
export function advisoryNumber(f){const p=f?.properties||f||{};const v=p.advisnum??p.ADVISNUM??p.advnum??p.ADVNUM??p.publicAdvisory?.advNum;return v==null?null:String(v).replace(/^0+(?=\d)/,'');}
export function compatibleCurrent(storm,systems){const c=systems.find(c=>c.id===storm.id);return c&&advisoryNumber(c)===advisoryNumber(storm.current)?c:null;}
export function movementKnots(current,point){return current?.movementSpeed!=null?Number(current.movementSpeed)/1.15078:Number(prop(point,'tcspd'));}
export const coastalColors={HWA:'#ff8ca5',HWR:'#ff4055',TWA:'#ffce57',TWR:'#4d95ff'};
