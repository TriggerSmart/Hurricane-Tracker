import {empty,prop,movementKnots,distanceMiles,validTime,forecastHour} from './core.js';
const MPH=1.15078,R=Math.PI/180;
const reading=(v,min=0,max=9998)=>v!=null&&v!==''&&Number.isFinite(Number(v))&&Number(v)>=min&&Number(v)<=max?Number(v):null;
export function stormReadings(point,current=null){
 const windKt=reading(current?.intensity??prop(point,'maxwind'),0,300),gustKt=reading(prop(point,'gust'),0,350),pressure=reading(current?.pressure??prop(point,'mslp'),800,1100);
 const raw=current?.movementSpeed!=null?current.movementSpeed:prop(point,'tcspd'),movementKt=reading(raw,0,200)==null?null:reading(movementKnots(current,point),0,200),bearing=reading(current?.movementDir??prop(point,'tcdir'),0,360);
 return {windKt,windMph:windKt==null?null:windKt*MPH,gustKt,gustMph:gustKt==null?null:gustKt*MPH,pressure,movementKt,movementMph:movementKt==null?null:movementKt*MPH,bearing,direction:bearing==null?null:['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'][Math.round(bearing/22.5)%16]};
}
function bearingTo(a,b){const p=a[1]*R,q=b[1]*R,d=(b[0]-a[0])*R;return (Math.atan2(Math.sin(d)*Math.cos(q),Math.cos(p)*Math.sin(q)-Math.sin(p)*Math.cos(q)*Math.cos(d))/R+360)%360;}
function destination(p,bearing,miles){const d=miles/3958.7613,b=bearing*R,lat=p[1]*R,lon=p[0]*R;const y=Math.asin(Math.sin(lat)*Math.cos(d)+Math.cos(lat)*Math.sin(d)*Math.cos(b));const x=lon+Math.atan2(Math.sin(b)*Math.sin(d)*Math.cos(lat),Math.cos(d)-Math.sin(lat)*Math.sin(y));return [((x/R+540)%360)-180,y/R];}
export function motionGeometry(point,bearing,speedKt){
 if(bearing==null||speedKt==null||speedKt<=0)return empty();
 const end=destination(point,bearing,speedKt*MPH*3);return {...empty(),features:[{type:'Feature',geometry:{type:'LineString',coordinates:[point,end]},properties:{}},{type:'Feature',geometry:{type:'Point',coordinates:end},properties:{bearing,label:`${Math.round(speedKt*MPH)} mph · 3h motion vector`}}]};
}
export function approachReadings(points,estimate,speedKt,bearing){
 if(!points.length||!estimate)return null;const current=points.find(p=>forecastHour(p)===0)||points[0],origin=current.geometry.coordinates,dist=distanceMiles(origin,estimate.point);
 let route=0,previous=origin;for(const p of points){if(forecastHour(p)<=forecastHour(current)||forecastHour(p)>=estimate.hour)continue;route+=distanceMiles(previous,p.geometry.coordinates);previous=p.geometry.coordinates;}route+=distanceMiles(previous,estimate.point);
 const start=validTime(current),hours=start==null?NaN:(estimate.time-start)/3600000;
 return {distanceMiles:dist,routeMiles:route,averageMph:estimate.kind==='landfall'&&hours>0?route/hours:null,closingMph:dist<.001||speedKt==null||bearing==null?null:speedKt*MPH*Math.cos((bearing-bearingTo(origin,estimate.point))*R)};
}
