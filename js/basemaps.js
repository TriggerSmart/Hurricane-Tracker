export const palettes={broadcast:{name:'Cyan / amber',track:'#56e1fa',cone:'#71dfef',estimate:'#ffc35c',radii:['#fed069','#ffae41','#ff5359']},accessible:{name:'Blue / orange',track:'#69b9ff',cone:'#b5d8ff',estimate:'#ffad66',radii:['#ffe79a','#f49d52','#da70dd']},contrast:{name:'White / gold',track:'#ffffff',cone:'#dae7ee',estimate:'#ffd438',radii:['#fff4a3','#ffb43b','#ff577f']}};
export function basemapTiles(mode,date){
 if(mode==='satellite')return {type:'raster',tiles:[`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_NOAA20_CorrectedReflectance_TrueColor/default/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`],tileSize:256,maxzoom:9,attribution:"NASA GIBS / ESDIS · NOAA-20 VIIRS daily true color"};
 if(mode==='terrain')return {type:'raster',tiles:['https://a.tile.opentopomap.org/{z}/{x}/{y}.png'],tileSize:256,maxzoom:17,attribution:'Map data: © OpenStreetMap contributors, SRTM | Map style: © OpenTopoMap (CC-BY-SA)'};
 return null;
}
export function basePresentation(layers,mode,palette){
 return layers.map(original=>{const l=JSON.parse(JSON.stringify(original));l.paint||={};l.layout||={};const border=/boundary|waterway|water_name/.test(l.id);
  l.layout.visibility=mode==='satellite'?(l.type==='symbol'||border?original.layout?.visibility||'visible':'none'):mode==='terrain'?(l.type==='line'&&/boundary/.test(l.id)?'visible':'none'):original.layout?.visibility||'visible';
  if(l.type==='background')l.paint['background-color']='#05070a';
  if(l.type==='fill')l.paint['fill-color']=/water/.test(l.id)?'#000000':'#05070a';
  if(l.type==='line'){l.paint['line-color']=border?'#ffffff':'#515d69';l.paint['line-opacity']=border?.85:.35;}
  if(l.type==='symbol'){l.paint['text-color']='#ffffff';l.paint['text-halo-color']='#05070a';l.paint['text-halo-width']=1.5;}
  return l;
 });
}
