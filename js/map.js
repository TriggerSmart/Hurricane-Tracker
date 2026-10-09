import {empty,prop,eventColor,boundsOf,coastalColors} from './core.js';
import {used} from './feeds.js';
import {basePresentation,basemapTiles,palettes} from './basemaps.js';
export const layerGroups={radar:['radar'],infrared:['infrared'],cone:['cone-fill','cone-line'],track:['track','track-points','track-label'],past:['past','past-points'],wind:['wind-fill','wind-line'],advisoryWind:['advisory-wind'],watches:['watches'],alerts:['alerts-fill','alerts-line','tornado-fill','tornado-line','warning-focus'],cameras:['camera-clusters','camera-count','camera-pins'],reports:['reports'],chasers:['chasers'],center:['storm-center','motion-line','motion-arrow','motion-label']};
export class WeatherMap{
 constructor(config,onStatus){
  this.status=onStatus;this.data={};this.visibility={};this.ready=false;this.lastPan=0;this.radarIndex=0;this.radarFrames=[];this.styleURL=config.style;this.fallback=config.fallbackStyle;this.basemap=['dark','satellite','terrain'].includes(config.basemap)?config.basemap:'dark';this.palette=palettes[config.palette]?config.palette:'broadcast';this.satelliteDate=config.satelliteDate||new Date(Date.now()-86400000).toISOString().slice(0,10);used('osm');
  if(!window.maplibregl){onStatus('map','error','Map library unavailable. CDN may be blocked.');return;}
  try{this.map=new maplibregl.Map({container:'map',style:config.style,center:[-87,29],zoom:4.6,attributionControl:false});}catch(e){onStatus('map','error',`WebGL map unavailable: ${e.message}`);return;}
  this.map.addControl(new maplibregl.NavigationControl({showCompass:false}),'bottom-right');this.map.addControl(new maplibregl.ScaleControl({unit:'imperial'}),'bottom-right');this.map.addControl(new maplibregl.AttributionControl({compact:true}),'bottom-right');
  this.map.on('dragstart',()=>{this.lastPan=Date.now();});this.map.on('zoomstart',e=>{if(e.originalEvent)this.lastPan=Date.now();});
  this.map.on('mousemove',e=>{document.getElementById('coords').textContent=`${e.lngLat.lat.toFixed(4)}° · ${e.lngLat.lng.toFixed(4)}°`;});
  this.map.on('style.load',()=>{this.ready=true;this.setup();this.onReady?.();});
  this.map.on('error',e=>{
   const msg=String(e.error?.message||'Map resource unavailable');
   if(!this.ready&&!this.didFallback){this.didFallback=true;onStatus('map','loading','Trying fallback vector style…');this.map.setStyle(this.fallback);}
   else if(!this.ready)onStatus('map','error',`Base map unavailable: ${msg}`);
   else if(e.sourceId==='base-imagery'){this.setBasemap('dark');onStatus('map','error','Imagery unavailable · restored black map; weather layers retained');this.onBasemapFallback?.();}
   else if(e.sourceId==='radar'){onStatus('radar','error','Radar tile unavailable; trying fallback');this.onRadarError?.();}
   else onStatus('map','error',`Some map tiles unavailable: ${msg.slice(0,80)}`);
  });
  this.map.on('click',async e=>{
   const hits=this.ready?this.map.queryRenderedFeatures(e.point,{layers:['storm-center','camera-pins','camera-clusters','track-points','reports','chasers'].filter(id=>this.map.getLayer(id))}):[];
   const h=hits[0];if(h?.layer.id==='camera-clusters'){const z=await this.map.getSource('cameras').getClusterExpansionZoom(h.properties.cluster_id);this.map.easeTo({center:h.geometry.coordinates,zoom:z});return;}
   if(h?.layer.id==='storm-center'){this.onStorm?.();return;}
   if(h?.layer.id==='camera-pins'){this.onCamera?.(String(h.properties.id));return;}
   if(h){const el=document.createElement('div');const p=h.properties;const title=document.createElement('strong');title.textContent=p.name||p.typetext||`${p.stormname||'Forecast'} · +${p.tau??'?'}h`;el.append(title);const text=document.createElement('p');text.textContent=p.note||p.remark||p.fldatelbl||'NWS local report; not a chaser location.';el.append(text);new maplibregl.Popup().setLngLat(e.lngLat).setDOMContent(el).addTo(this.map);return;}
   this.onPoint?.([e.lngLat.lng,e.lngLat.lat]);
  });
 }
 setup(){
  this.baseLayers=JSON.parse(JSON.stringify(this.map.getStyle().layers));this.applyBasemap();
  const firstLabel=this.map.getStyle().layers.find(l=>l.type==='symbol')?.id;
  const source=(id,cluster=false)=>this.map.addSource(id,{type:'geojson',data:this.data[id]||empty(),...(cluster?{cluster:true,clusterMaxZoom:12,clusterRadius:45}:{})});
  ['cone','track','past','wind','advisoryWind','watches','alerts','reports','chasers','center','estimate','motion','tornado','warningFocus'].forEach(id=>source(id));source('cameras',true);
  const layer=(id,source,type,paint,extra={})=>this.map.addLayer({id,source,type,paint,...extra},firstLabel);
  layer('cone-fill','cone','fill',{'fill-color':'#49cde2','fill-opacity':.12});layer('cone-line','cone','line',{'line-color':'#71dfef','line-width':2});
  layer('wind-fill','wind','fill',{'fill-color':['match',['to-number',['coalesce',['get','radii'],['get','RADII'],34]],64,'#ff5359',50,'#ffae41','#fed069'],'fill-opacity':.10});layer('wind-line','wind','line',{'line-color':'#ffc566','line-width':1});
  layer('advisory-wind','advisoryWind','fill',{'fill-color':'#ffba5c','fill-opacity':.1});
  layer('alerts-fill','alerts','fill',{'fill-color':['get','color'],'fill-opacity':.17});layer('alerts-line','alerts','line',{'line-color':['get','color'],'line-width':2});
  layer('tornado-fill','tornado','fill',{'fill-color':'#ff4055','fill-opacity':.25});layer('tornado-line','tornado','line',{'line-color':'#ff4055','line-width':5});layer('warning-focus','warningFocus','line',{'line-color':'#ffffff','line-width':3,'line-dasharray':[3,1]});
  layer('watches','watches','line',{'line-color':['match',['coalesce',['get','tcww'],['get','TCWW'],''],'HWA',coastalColors.HWA,'HWR',coastalColors.HWR,'TWA',coastalColors.TWA,'TWR',coastalColors.TWR,'#b7c9d5'],'line-width':5});
  layer('track','track','line',{'line-color':'#56e1fa','line-width':3,'line-dasharray':[2,1]},{filter:['==',['geometry-type'],'LineString']});
  layer('past','past','line',{'line-color':'#bec7d1','line-width':2,'line-dasharray':[2,2]},{filter:['==',['geometry-type'],'LineString']});
  layer('past-points','past','circle',{'circle-color':'#aab9c2','circle-radius':3},{filter:['==',['geometry-type'],'Point']});
  layer('track-points','track','circle',{'circle-color':'#0e1e29','circle-stroke-color':'#67e4fa','circle-stroke-width':2,'circle-radius':5},{filter:['==',['geometry-type'],'Point']});
  this.map.addLayer({id:'track-label',source:'track',type:'symbol',filter:['==',['geometry-type'],'Point'],layout:{'text-field':['concat','+',['to-string',['coalesce',['get','tau'],['get','TAU'],'?']],'h'],'text-size':13,'text-offset':[0,1.2]},paint:{'text-color':'#b8f6ff','text-halo-color':'#071017','text-halo-width':2}});
  layer('camera-clusters','cameras','circle',{'circle-radius':18,'circle-color':'#193c45','circle-stroke-color':'#48d4ef','circle-stroke-width':1},{filter:['has','point_count']});
  this.map.addLayer({id:'camera-count',source:'cameras',type:'symbol',filter:['has','point_count'],layout:{'text-field':['to-string',['get','point_count_abbreviated']],'text-size':12},paint:{'text-color':'#fff'}});
  layer('camera-pins','cameras','circle',{'circle-radius':6,'circle-color':'#47d7ec','circle-stroke-width':2,'circle-stroke-color':'#07151c'},{filter:['!', ['has','point_count']]});
  layer('reports','reports','circle',{'circle-color':'#f4aa4c','circle-radius':5,'circle-stroke-color':'#09131b','circle-stroke-width':1});
  layer('chasers','chasers','circle',{'circle-color':'#fff','circle-radius':6,'circle-stroke-color':'#8996a3','circle-stroke-width':2});
  layer('storm-center','center','circle',{'circle-radius':10,'circle-color':'#53e2f9','circle-stroke-color':'#fff','circle-stroke-width':2});
  layer('motion-line','motion','line',{'line-color':'#ffffff','line-width':2,'line-dasharray':[3,2]},{filter:['==',['geometry-type'],'LineString']});
  this.map.addLayer({id:'motion-arrow',source:'motion',type:'symbol',filter:['==',['geometry-type'],'Point'],layout:{'text-field':'▲','text-size':22,'text-rotate':['get','bearing'],'text-rotation-alignment':'map','text-allow-overlap':true},paint:{'text-color':'#ffffff','text-halo-color':'#05070a','text-halo-width':2}});
  this.map.addLayer({id:'motion-label',source:'motion',type:'symbol',filter:['==',['geometry-type'],'Point'],layout:{'text-field':['get','label'],'text-size':11,'text-offset':[0,2]},paint:{'text-color':'#ffffff','text-halo-color':'#05070a','text-halo-width':2}});
  layer('estimate-point','estimate','circle',{'circle-radius':8,'circle-color':'#ffc35c','circle-stroke-color':'#fff','circle-stroke-width':2});
  this.applyPalette();this.updateMarker();
  if(this.infraredFrame)this.infrared(this.infraredFrame);if(this.displayedRadar)this.radar(this.displayedRadar);else if(this.radarFrames[this.radarIndex]&&!this.radarFrames[this.radarIndex].raw)this.radar(this.radarFrames[this.radarIndex]);
  for(const [group,on] of Object.entries(this.visibility))this.toggle(group,on);
 }
 highlightWarning(feature){this.focusedWarning=feature.id||feature.properties?.id;clearTimeout(this.highlightTimer);this.set('warningFocus',{...empty(),features:feature.geometry?[feature]:[]});this.highlightTimer=setTimeout(()=>{this.focusedWarning=null;this.set('warningFocus',empty());},15000);}
 setBasemap(mode,date=this.satelliteDate){this.basemap=['dark','satellite','terrain'].includes(mode)?mode:'dark';this.satelliteDate=date;if(this.ready)this.applyBasemap();}
 applyBasemap(){
  if(!this.ready)return;for(const l of basePresentation(this.baseLayers,this.basemap,this.palette)){try{this.map.setLayoutProperty(l.id,'visibility',l.layout.visibility);for(const [k,v] of Object.entries(l.paint))this.map.setPaintProperty(l.id,k,v);}catch{/* An optional base-style paint property may be unsupported. */}}
  if(this.map.getLayer('base-imagery'))this.map.removeLayer('base-imagery');if(this.map.getSource('base-imagery'))this.map.removeSource('base-imagery');
  const raster=basemapTiles(this.basemap,this.satelliteDate);if(raster){used(this.basemap==='satellite'?'gibs':'terrain');this.map.addSource('base-imagery',raster);const before=this.baseLayers.find(l=>l.type==='line'||l.type==='symbol')?.id;this.map.addLayer({id:'base-imagery',type:'raster',source:'base-imagery',paint:{'raster-opacity':1,'raster-fade-duration':0}},before);}
  this.status('map','ok',this.basemap==='satellite'?`NASA VIIRS · ${this.satelliteDate} UTC · daily imagery`:this.basemap==='terrain'?'OpenTopoMap · terrain & contours':'Black map · white borders & labels');
 }
 setPalette(key){this.palette=palettes[key]?key:'broadcast';if(this.ready)this.applyPalette();}
 applyPalette(){const p=palettes[this.palette];for(const [id,key,value] of [['cone-fill','fill-color',p.cone],['cone-line','line-color',p.cone],['track','line-color',p.track],['track-points','circle-stroke-color',p.track],['track-label','text-color',p.track],['storm-center','circle-color',p.track],['estimate-point','circle-color',p.estimate],['wind-line','line-color',['match',['to-number',['coalesce',['get','radii'],['get','RADII'],34]],64,p.radii[2],50,p.radii[1],p.radii[0]]],['wind-fill','fill-color',['match',['to-number',['coalesce',['get','radii'],['get','RADII'],34]],64,p.radii[2],50,p.radii[1],p.radii[0]]]])if(this.map.getLayer(id))this.map.setPaintProperty(id,key,value);}
 updateMarker(){
  const point=this.data.center?.features?.[0];if(!point){this.marker?.remove();this.marker=null;return;}if(!maplibregl.Marker)return;
  if(!this.marker){const node=document.createElement('button');node.className='hurricane-marker';node.type='button';node.setAttribute('aria-label','Latest advisory storm center; open tracker');node.innerHTML='<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="#05070a" fill-opacity=".9" stroke="currentColor"/><path d="M17 32C17 13 37 8 47 20C37 15 28 19 27 27M47 32C47 51 27 56 17 44C27 49 36 45 37 37" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/><circle cx="32" cy="32" r="7" fill="none" stroke="#fff" stroke-width="3"/></svg>';node.onclick=e=>{e.stopPropagation();this.onStorm?.();};this.marker=new maplibregl.Marker({element:node}).setLngLat(point.geometry.coordinates).addTo(this.map);}
  else this.marker.setLngLat(point.geometry.coordinates);this.marker.getElement().hidden=this.visibility.center===false;
 }
 set(id,data){this.data[id]=data;if(this.ready)this.map.getSource(id)?.setData(data);if(id==='center'&&this.ready)this.updateMarker();}
 toggle(group,on){this.visibility[group]=on;if(group==='center'&&this.marker)this.marker.getElement().hidden=!on;if(this.ready)for(const id of layerGroups[group]||[])if(this.map.getLayer(id))this.map.setLayoutProperty(id,'visibility',on?'visible':'none');}
 raster(id,frame,opacity){if(!this.ready)return;if(this.map.getLayer(id))this.map.removeLayer(id);if(this.map.getSource(id))this.map.removeSource(id);this.map.addSource(id,frame.coordinates?{type:'image',url:frame.url,coordinates:frame.coordinates,attribution:frame.attribution}:{type:'raster',tiles:[frame.url],tileSize:256,maxzoom:frame.maxzoom,attribution:frame.attribution});const before=this.map.getLayer('cone-fill')?'cone-fill':undefined;this.map.addLayer({id,type:'raster',source:id,paint:{'raster-opacity':opacity,'raster-fade-duration':150}},before);this.toggle(id,this.visibility[id]!==false);}
 radar(frame){this.raster('radar',frame,.8);}
 infrared(frame){this.infraredFrame=frame;this.raster('infrared',frame,.36);}
 frame(index){this.radarIndex=index;const f=this.radarFrames[index];if(f)this.radar(f);}
 fit(features){const b=boundsOf(features);if(!b||!this.map)return;const stage=document.getElementById('stage').getBoundingClientRect(),visibleWidth=selector=>{const node=document.querySelector(selector);return node&&getComputedStyle(node).display!=='none'?node.getBoundingClientRect().width:0;};const padding={top:Math.min(210,stage.height*.2),bottom:Math.min(180,stage.height*.2),left:Math.min(visibleWidth('.tools')+28,stage.width*.27),right:Math.min(visibleWidth('.rail')+28,stage.width*.27)};this.map.fitBounds(b,{padding,maxZoom:9,duration:900});}
 popup(point,el){if(this.map)return new maplibregl.Popup({maxWidth:'320px'}).setLngLat(point).setDOMContent(el).addTo(this.map);}
}
