// NOAA RPG Level III products 159 (ZDR) and 161 (CC), digital radial packet 16.
// Threshold floats are big endian; codes 0/1 are missing/range-folded, never measurements.
import {decompress} from './vendor/bunzip.js';
export function decodeLevel3(bytes){
 const input=new Uint8Array(bytes),v=new DataView(input.buffer,input.byteOffset,input.byteLength);let start=-1;
 for(let i=0;i<Math.min(100,input.length-120);i++)if([159,161].includes(v.getUint16(i))&&v.getInt16(i+18)===-1){start=i;break;}
 if(start<0)throw Error('Unsupported or truncated Level III product');const d=start+18,code=v.getUint16(start),size=v.getUint32(d+84);
 if(size<30||size>2000000)throw Error('Invalid radar decompression size');
 const raw=decompress(input.subarray(start+120),size),r=new DataView(raw.buffer,raw.byteOffset,raw.byteLength);
 if(r.getInt16(0)!==-1||r.getUint16(2)!==1||r.getUint16(8)!==1||r.getUint16(16)!==16)throw Error('Unsupported radar symbology');
 const bins=r.getUint16(20),count=r.getUint16(28);if(bins<1||bins>2000||count<1||count>1440)throw Error('Invalid radial dimensions');
 let offset=30;const radials=[];for(let i=0;i<count;i++){if(offset+6>raw.length)throw Error('Truncated radar radial');const n=r.getUint16(offset),angle=r.getInt16(offset+2)/10,delta=r.getInt16(offset+4)/10;offset+=6;if(n!==bins||offset+n>raw.length)throw Error('Truncated radar bins');radials.push({angle,delta,data:raw.slice(offset,offset+n)});offset+=n;}
 const scale=v.getFloat32(d+42),bias=v.getFloat32(d+46);if(!Number.isFinite(scale)||scale<=0||!Number.isFinite(bias))throw Error('Invalid radar value scale');
 return {code,lat:v.getInt32(d+2)/1000,lon:v.getInt32(d+6)/1000,time:(v.getUint16(d+22)-1)*86400000+v.getUint32(d+24)*1000,scale,offset:bias,first:r.getUint16(18),gateKm:300/bins,maxCode:v.getUint16(d+52),leadingFlags:v.getUint16(d+54),trailingFlags:v.getUint16(d+56),elevation:v.getInt16(d+40)/10,radials};
}
export const radarValue=(d,code)=>code<d.leadingFlags||code>d.maxCode-d.trailingFlags?null:(code-d.offset)/d.scale;
export function radarColor(product,value){
 if(value==null)return [0,0,0,0];const stops=product==='cc'?[[.2,[45,50,120]],[.6,[70,124,240]],[.8,[33,220,180]],[.9,[255,227,40]],[.95,[255,134,30]],[.98,[240,35,95]],[1.05,[177,70,220]]]:[[-8,[20,30,95]],[-2,[62,131,240]],[0,[210,230,244]],[1,[55,209,92]],[3,[255,225,46]],[5,[242,99,45]],[8,[213,52,190]]];
 let color=stops[0][1];for(const [threshold,c] of stops)if(value>=threshold)color=c;return [...color,225];
}
export function renderGrid(d,product,size=768){
 const R=6371008.8,rad=Math.PI/180,mercY=lat=>R*Math.log(Math.tan(Math.PI/4+lat*rad/2)),invY=y=>(2*Math.atan(Math.exp(y/R))-Math.PI/2)/rad,cx=R*d.lon*rad,cy=mercY(d.lat),range=300000/Math.cos(d.lat*rad),minX=cx-range,maxX=cx+range,minY=cy-range,maxY=cy+range;
 const image=new Uint8ClampedArray(size*size*4),lookup=new Int16Array(3600);lookup.fill(-1);d.radials.forEach((r,i)=>{for(let a=Math.round(r.angle*10);a<Math.round((r.angle+r.delta)*10);a++)lookup[(a+3600)%3600]=i;});
 const lat0=d.lat*rad;for(let y=0;y<size;y++){const lat=invY(maxY-(y+.5)/size*(maxY-minY))*rad;for(let x=0;x<size;x++){const lon=(minX+(x+.5)/size*(maxX-minX))/R,dl=lon-d.lon*rad,dp=lat-lat0,h=Math.sin(dp/2)**2+Math.cos(lat0)*Math.cos(lat)*Math.sin(dl/2)**2,km=R*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h))/1000,bin=Math.floor(km/d.gateKm)-d.first;if(bin<0||km>=300)continue;const az=(Math.atan2(Math.sin(dl)*Math.cos(lat),Math.cos(lat0)*Math.sin(lat)-Math.sin(lat0)*Math.cos(lat)*Math.cos(dl))/rad+360)%360,ri=lookup[Math.floor(az*10)];if(ri<0||bin>=d.radials[ri].data.length)continue;const c=radarColor(product,radarValue(d,d.radials[ri].data[bin]));image.set(c,(y*size+x)*4);}}
 return {pixels:image,size,coordinates:[[minX/R/rad,invY(maxY)],[maxX/R/rad,invY(maxY)],[maxX/R/rad,invY(minY)],[minX/R/rad,invY(minY)]]};
}
