import {empty,alertRelevant,prop,safeURL} from './core.js';
export const NOAA='https://mapservices.weather.noaa.gov/tropical/rest/services/tropical/NHC_tropical_weather_summary/MapServer';
export const sourceInfo={
 noaa:['NOAA tropical layers',NOAA,'NOAA / NWS / National Hurricane Center / Central Pacific Hurricane Center'],
 noaaRadar:['NOAA station radar','https://www.weather.gov/gis/cloudgiswebservices','NOAA / National Weather Service NEXRAD'],
 level3:['NEXRAD Level III dual-pol','https://registry.opendata.aws/noaa-nexrad/','NOAA NEXRAD / NSF Unidata Open Data'],
 nhc:['NHC current storm products','https://www.nhc.noaa.gov/CurrentStorms.json','NOAA National Hurricane Center'],
 nws:['NWS active alerts','https://api.weather.gov/alerts/active?status=actual','National Weather Service'],
 iem:['IEM NEXRAD composite','https://mesonet.agron.iastate.edu/docs/nexrad_composites/','Iowa Environmental Mesonet / NWS NEXRAD'],
 lsr:['IEM local storm reports','https://mesonet.agron.iastate.edu/geojson/lsr.php?hours=6','Iowa Environmental Mesonet / National Weather Service'],
 rain:['RainViewer radar','https://www.rainviewer.com/api.html','Weather data by RainViewer'],
 osm:['OpenFreeMap vector map','https://openfreemap.org/','OpenFreeMap · © OpenMapTiles · © OpenStreetMap contributors (ODbL)'],
 gibs:['NASA daily satellite imagery','https://nasa-gibs.github.io/gibs-api-docs/','Imagery provided by NASA GIBS, part of ESDIS · NOAA-20 VIIRS'],
 terrain:['OpenTopoMap terrain','https://wiki.opentopomap.org/about','© OpenStreetMap contributors, SRTM · © OpenTopoMap (CC-BY-SA)'],
 nominatim:['Nominatim place lookup','https://nominatim.openstreetmap.org/','© OpenStreetMap contributors (ODbL)'],
 coast:['Natural Earth coastline','https://www.naturalearthdata.com/about/terms-of-use/','Made with Natural Earth. Public domain; 1:110m simplified coastline.'],
 local:['Bundled operator data','data/chasers.json','Manual operator pins are not verified. Camera catalog provenance is in data/camera-sources.json.']
};
const requested=new Set();
export function used(key){if(!requested.has(key)){requested.add(key);window.dispatchEvent(new CustomEvent('source-used',{detail:{key,info:sourceInfo[key]}}));}}
export async function fetchJSON(url,key,{timeout=18000,...options}={}){
 if(key)used(key);const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
 try{const r=await fetch(url,{headers:{Accept:'application/geo+json, application/json'},...options,signal:controller.signal});if(!r.ok)throw Error(`HTTP ${r.status}`);const data=await r.json();if(data.error)throw Error(data.error.message||'Source returned an error');return data;}finally{clearTimeout(timer);}
}
export async function queryLayer(id){
 const all=empty();let offset=0;
 for(let page=0;page<20;page++){
  const q=new URLSearchParams({f:'geojson',where:'1=1',outFields:'*',outSR:'4326',resultOffset:String(offset),resultRecordCount:'2000'});
  const data=await fetchJSON(`${NOAA}/${id}/query?${q}`,'noaa');if(!Array.isArray(data.features))throw Error('Not a GeoJSON feature collection');all.features.push(...data.features);
  if(!data.exceededTransferLimit&&data.features.length<2000)return all;
  if(!data.features.length)return all;offset+=data.features.length;
 }
 throw Error('NOAA result exceeded pagination limit');
}
export async function getAlerts(){
 let url='https://api.weather.gov/alerts/active?status=actual';const features=[];
 for(let i=0;url&&i<25;i++){
  const data=await fetchJSON(url,'nws');if(!Array.isArray(data.features))throw Error('Invalid NWS response');features.push(...data.features.filter(f=>alertRelevant(f.properties?.event)));
  const next=data.pagination?.next;url=next&&new URL(next).hostname==='api.weather.gov'?next:null;
 }
 const unique=[...new Map(features.map(f=>[f.id||f.properties?.id,f])).values()];return {type:'FeatureCollection',features:unique.map(f=>({...f,properties:{...f.properties,eventColor:null}}))};
}
export async function getReports(){const data=await fetchJSON('https://mesonet.agron.iastate.edu/geojson/lsr.php?hours=6','lsr');return {...data,features:(data.features||[]).filter(f=>/TORNADO|HAIL|WIND|FLOOD/i.test(prop(f,'typetext')||''))};}
export async function getCurrentStorms(){const data=await fetchJSON('https://www.nhc.noaa.gov/CurrentStorms.json','nhc');return data.activeStorms||[];}
export async function getAdvisory(url){
 if(!safeURL(url)||new URL(url).hostname!=='www.nhc.noaa.gov')throw Error('No public advisory URL');used('nhc');const controller=new AbortController(),t=setTimeout(()=>controller.abort(),14000);
 try{const r=await fetch(url,{signal:controller.signal});if(!r.ok)throw Error(`HTTP ${r.status}`);const doc=new DOMParser().parseFromString(await r.text(),'text/html');return (doc.querySelector('pre')?.textContent||'').trim().slice(0,2300);}finally{clearTimeout(t);}
}
export function iemFrames(){const now=Math.floor(Date.now()/300000)*300;return [25,20,15,10,5,0].map(min=>({time:(now-min*60)*1000,approx:true,url:`https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::USCOMP-N0Q-${min}/{z}/{x}/{y}.png?v=${Math.floor(Date.now()/90000)}`,maxzoom:12,attribution:'Iowa Environmental Mesonet / NWS NEXRAD'}));}
export async function rainFrames(){const data=await fetchJSON('https://api.rainviewer.com/public/weather-maps.json','rain');return {radar:(data.radar?.past||[]).slice(-8).map(f=>({time:f.time*1000,url:`${data.host}${f.path}/256/{z}/{x}/{y}/2/1_1.png`,maxzoom:7,attribution:'Weather data by RainViewer'})),infrared:(data.satellite?.infrared||[]).slice(-1).map(f=>({url:`${data.host}${f.path}/256/{z}/{x}/{y}/0/0_0.png`,maxzoom:7,attribution:'Weather data by RainViewer'}))};}
export function probeImage(url,timeout=12000){return new Promise((resolve,reject)=>{const img=new Image(),timer=setTimeout(()=>{img.src='';reject(Error('Image timed out'));},timeout);img.onload=()=>{clearTimeout(timer);resolve(true);};img.onerror=()=>{clearTimeout(timer);reject(Error('Tile unavailable'));};img.src=url;});}
let geocodeQueue=Promise.resolve(),lastLookup=0;const geocodeCache=new Map();
export function geocode(params,base='https://nominatim.openstreetmap.org/'){
 const path=params.q?'search':'reverse',key=path+JSON.stringify(params);if(geocodeCache.has(key))return Promise.resolve(geocodeCache.get(key));
 const task=async()=>{const delay=1100-(Date.now()-lastLookup);if(delay>0)await new Promise(r=>setTimeout(r,delay));lastLookup=Date.now();const q=new URLSearchParams({format:'jsonv2',...params});
  // Browser sends Referer; User-Agent is forbidden. Accept is a content type, not an identity header.
  const result=await fetchJSON(`${base.replace(/\/?$/,'/')}${path}?${q}`,'nominatim',{referrerPolicy:'strict-origin-when-cross-origin'});geocodeCache.set(key,result);return result;};
 const p=geocodeQueue.then(task,task);geocodeQueue=p.catch(()=>{});return p;
}
