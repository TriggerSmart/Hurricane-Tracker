import {safeURL,distanceMiles} from './core.js';
export function cameraType(camera){return camera.type||'snapshot';}
export function supportedCamera(c){const type=cameraType(c);return type==='snapshot'?!!safeURL(c.snapshotUrl):type==='video'?!!safeURL(c.embedUrl):type==='link'?!!safeURL(c.pageUrl):false;}
export function chooseCameras(cameras,{focus,scope='near',provider='all',kind='all',search=''}={}){
 const all=cameras.filter(supportedCamera).filter(c=>(provider==='all'||c.sourceKey===provider)&&(kind==='all'||(kind==='video'?cameraType(c)!=='snapshot':cameraType(c)==='snapshot'))&&`${c.name} ${c.city} ${c.state} ${c.sourceName}`.toLowerCase().includes(search.toLowerCase())).map(c=>({...c,distance:Number.isFinite(c.lat)&&Number.isFinite(c.lon)&&focus?distanceMiles(focus,[c.lon,c.lat]):null})).sort((a,b)=>(a.distance??Infinity)-(b.distance??Infinity));
 const near=all.filter(c=>c.distance!=null&&c.distance<=150);return {cameras:scope==='all'?all:near.length?near:all,expanded:scope!=='all'&&!near.length&&all.length>0,total:all.length};
}
