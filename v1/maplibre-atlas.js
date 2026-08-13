(function(){
  'use strict';

  const api = window.BakuAtlas;
  let maplibregl = window.__BakuMapLibre;
  const stage = document.getElementById('stage');
  const container = document.getElementById('maplibreMap');
  if(!api || !container) return;

  const BBOX = [[49.20,39.85],[50.75,40.75]];
  const sourceUrl = 'pmtiles://../assets/baku-absheron.pmtiles';
  const fontUrl = '../assets/glyphs/{fontstack}/{range}.pbf';
  const colors = {hot:'#c4501f',est:'#2a6bb8',fr:'#0e7d5a'};
  const NS = 'http://www.w3.org/2000/svg';
  let map = null;
  let ready = false;
  let markers = [];
  let baseSelect = window.select;
  let baseSetYear = window.setYear;
  let baseSetLang = window.setLang;
  let baseToggleHeat = window.toggleHeat;
  let baseToggleMetro = window.toggleMetro;
  let baseApplyDim = window.applyDim;
  let baseSpotlight = window.spotlight;
  let baseClearSpot = window.clearSpot;
  let baseTourGo = window.tourGo;
  let baseEndTour = window.endTour;

  const style = {
    version:8,
    name:'Baku 2036 Shortbread',
    glyphs:fontUrl,
    sources:{
      basemap:{type:'vector',url:sourceUrl},
      zones:{type:'geojson',data:{type:'FeatureCollection',features:[]}},
      heat:{type:'geojson',data:{type:'FeatureCollection',features:[]}},
      metro:{type:'geojson',data:{type:'FeatureCollection',features:[]}},
      metroStations:{type:'geojson',data:{type:'FeatureCollection',features:[]}},
      events:{type:'geojson',data:{type:'FeatureCollection',features:[]}},
      spotLines:{type:'geojson',data:{type:'FeatureCollection',features:[]}},
      spotPoints:{type:'geojson',data:{type:'FeatureCollection',features:[]}}
    },
    layers:[
      {id:'background',type:'background',paint:{'background-color':'#e8e7df'}},
      {id:'water',type:'fill',source:'basemap','source-layer':'water_polygons',paint:{'fill-color':'#c9e0e4','fill-opacity':.95}},
      {id:'coast-ocean',type:'fill',source:'basemap','source-layer':'ocean',paint:{'fill-color':'#c9e0e4','fill-opacity':.8}},
      {id:'landuse',type:'fill',source:'basemap','source-layer':'land',paint:{'fill-color':'#e9e7dd','fill-opacity':.62}},
      {id:'boundaries',type:'line',source:'basemap','source-layer':'boundaries',paint:{'line-color':'#aab2ad','line-width':1,'line-dasharray':[2,2]}},
      {id:'street-polygons',type:'fill',source:'basemap','source-layer':'street_polygons',paint:{'fill-color':['match',['get','kind'],['motorway','trunk'],'#c9a98d',['primary','secondary'],'#d5c5ae','#ddd8cc'],'fill-opacity':.9}},
      {id:'streets',type:'line',source:'basemap','source-layer':'streets',minzoom:13,paint:{'line-color':['match',['get','kind'],['motorway','trunk'],'#a96f52',['primary','secondary'],'#b68d62','#b8b8b1'],'line-width':['interpolate',['linear'],['zoom'],13,.7,14,2.4],'line-opacity':.9}},
      {id:'buildings',type:'fill',source:'basemap','source-layer':'buildings',minzoom:13,paint:{'fill-color':'#d4cfc4','fill-outline-color':'#bbb4aa','fill-opacity':['interpolate',['linear'],['zoom'],13,.22,14,.7]}},
      {id:'building-extrusions',type:'fill-extrusion',source:'basemap','source-layer':'buildings',minzoom:12,layout:{visibility:'none'},paint:{'fill-extrusion-color':['interpolate',['linear'],['coalesce',['get','levels'],1],1,'#d9d2c5',8,'#a7a59f',18,'#777b80'],'fill-extrusion-height':['coalesce',['get','height'],['*',['coalesce',['get','levels'],2],3.2],6],'fill-extrusion-base':['coalesce',['get','min_height'],0],'fill-extrusion-opacity':.78,'fill-extrusion-vertical-gradient':true}},

      {id:'place-labels',type:'symbol',source:'basemap','source-layer':'place_labels',layout:{'text-field':['coalesce',['get','name_en'],['get','name']],'text-font':['noto_sans_regular'],'text-size':['interpolate',['linear'],['zoom'],8,10,12,15]},paint:{'text-color':'#4d5659','text-halo-color':'#f5f3ec','text-halo-width':1.5}},
      {id:'street-labels',type:'symbol',source:'basemap','source-layer':'street_labels',minzoom:10,layout:{'symbol-placement':'line','text-field':['coalesce',['get','name_en'],['get','name']],'text-font':['noto_sans_regular'],'text-size':10},paint:{'text-color':'#697176','text-halo-color':'#f4f2ec','text-halo-width':1}},
      {id:'metro-halo',type:'line',source:'metro',paint:{'line-color':'#fffdf8','line-width':6,'line-opacity':['case',['get','built'],.8,.35]}},
      {id:'metro-lines',type:'line',source:'metro',paint:{'line-color':['get','color'],'line-width':['case',['get','built'],3,2.2],'line-opacity':['case',['get','built'],1,.58],'line-dasharray':['case',['get','built'],['literal',[1,0]],['literal',[2,2]]]}} ,
      {id:'metro-stations',type:'circle',source:'metroStations',paint:{'circle-radius':['case',['get','built'],4,3],'circle-color':['get','color'],'circle-stroke-color':'#fffdf8','circle-stroke-width':1.2,'circle-opacity':['case',['get','built'],1,.55]}},
      {id:'heat',type:'circle',source:'heat',layout:{visibility:'none'},paint:{'circle-radius':['interpolate',['linear'],['zoom'],8,['*',['get','r'],.32],11,['*',['get','r'],.85],14,['*',['get','r'],1.35]],'circle-color':['get','color'],'circle-opacity':['get','opacity'],'circle-blur':.75}},
      {id:'zone-ring',type:'circle',source:'zones',paint:{'circle-radius':['interpolate',['linear'],['zoom'],8,['*',['get','r'],.62],11,['*',['get','r'],1],14,['*',['get','r'],1.4]],'circle-color':'rgba(0,0,0,0)','circle-stroke-color':['get','color'],'circle-stroke-width':1.5,'circle-stroke-opacity':['case',['get','dim'],.12,.52]}},
      {id:'zone-body',type:'circle',source:'zones',paint:{'circle-radius':['interpolate',['linear'],['zoom'],8,['*',['get','r'],.5],11,['get','r'],14,['*',['get','r'],1.35]],'circle-color':['get','color'],'circle-opacity':['case',['get','dim'],.1,['case',['get','selected'],.75,.58]],'circle-stroke-color':['get','color'],'circle-stroke-width':1.5,'circle-stroke-opacity':['case',['get','dim'],.12,.85]}},
      {id:'zone-core',type:'circle',source:'zones',paint:{'circle-radius':3,'circle-color':['get','color'],'circle-opacity':['case',['get','dim'],.08,1]}},
      {id:'zone-ranks',type:'symbol',source:'zones',filter:['!=',['get','rank'],0],layout:{'text-field':['to-string',['get','rank']],'text-font':['noto_sans_bold'],'text-size':10,'text-offset':[1,-1]},paint:{'text-color':['get','color'],'text-halo-color':'#fffdf8','text-halo-width':2,'text-opacity':['case',['get','dim'],.12,1]}},
      {id:'proof-badges',type:'symbol',source:'zones',filter:['==',['get','proof'],true],layout:{'text-field':'✓','text-font':['noto_sans_bold'],'text-size':11,'text-offset':[-1,1]},paint:{'text-color':'#a97c1e','text-halo-color':'#fffdf8','text-halo-width':1.5,'text-opacity':['case',['get','dim'],.12,1]}},
      {id:'zone-labels',type:'symbol',source:'zones',layout:{'text-field':['get','label'],'text-font':['noto_sans_bold'],'text-size':11,'text-anchor':'top','text-offset':['get','labelOffset']},paint:{'text-color':'#1e2430','text-halo-color':'#fffdf8','text-halo-width':2.2,'text-opacity':['case',['get','dim'],.16,1]}},
      {id:'event-diamonds',type:'symbol',source:'events',filter:['==',['get','show'],true],layout:{'text-field':'◆','text-font':['noto_sans_bold'],'text-size':14},paint:{'text-color':'#1b3a5c','text-halo-color':'#fffdf8','text-halo-width':1.5}},
      {id:'spot-lines',type:'line',source:'spotLines',paint:{'line-color':'#1b3a5c','line-width':1.8,'line-dasharray':[2,2],'line-opacity':.88}},
      {id:'spot-points',type:'circle',source:'spotPoints',paint:{'circle-radius':4,'circle-color':'#1b3a5c','circle-stroke-color':'#fffdf8','circle-stroke-width':1}},
      {id:'spot-labels',type:'symbol',source:'spotPoints',layout:{'text-field':['get','label'],'text-font':['noto_sans_bold'],'text-size':10,'text-anchor':'bottom','text-offset':[0,-.8]},paint:{'text-color':'#fffdf8','text-halo-color':'#1b3a5c','text-halo-width':3}}
    ]
  };

  function featureCollection(features){ return {type:'FeatureCollection',features}; }
  function pointFeature(coords,properties){ return {type:'Feature',geometry:{type:'Point',coordinates:coords},properties:properties||{}}; }
  function lineFeature(coords,properties){ return {type:'Feature',geometry:{type:'LineString',coordinates:coords},properties:properties||{}}; }
  function hslToHex(h,s,l){
    s/=100; l/=100;
    const k=n=>(n+h/30)%12;
    const a=s*Math.min(l,1-l);
    const f=n=>l-a*Math.max(-1,Math.min(k(n)-3,Math.min(9-k(n),1)));
    return '#'+[f(0),f(8),f(4)].map(v=>Math.round(255*v).toString(16).padStart(2,'0')).join('');
  }
  function labelOffset(z){
    const p=({whitecity:[1,.5],yasamal:[-1,1.8],narimanov:[1,-1.4],sabail:[-3,1.8],khojasan:[-4,-1.3],khirdalan:[-6,-.2],novkhani:[-4,-.2],mohammadi:[1,-.4],airport:[1,1.4],hovsan:[-3,1.8],zikh:[1,1],lokbatan:[1,-.2]})[z.id];
    return p||[1,.7];
  }
  function zoneFeatures(){
    const filter=api.filter;
    return api.zones.map(z=>{
      let dim=filter!=='all'&&z.t!==filter;
      if(api.profile && api.profiles[api.profile] && !api.profiles[api.profile].zones.includes(z.id)) dim=true;
      if(api.budget!==null && api.budget < api.mint[z.id]) dim=true;
      return pointFeature(z.ll,{id:z.id,tier:z.t,rank:z.rank||0,r:z.r||12,color:colors[z.t],dim:!!dim,selected:api.active===z.id,proof:api.proofIds.includes(z.id),label:z.n.split(' (')[0].split(' —')[0],labelOffset:labelOffset(z)});
    });
  }
  function heatFeatures(){
    return api.zones.map(z=>{
      let g=api.growth(z); if(g===null) g=120;
      const hue=api.heatHue(g);
      return pointFeature(z.ll,{r:z.edge?42:Math.min(95,(z.r||12)*3.6),color:hslToHex(hue,78,50),opacity:.42});
    });
  }
  function metroFeatures(){
    const y=api.year;
    return api.metro.map(s=>lineFeature(s.pts,{line:s.line,color:s.color,open:s.open,built:s.open<=y}));
  }
  function stationFeatures(){
    const y=api.year, out=[];
    api.metro.forEach(s=>s.stns.forEach(p=>out.push(pointFeature(p,{color:s.color,built:s.open<=y}))));
    return out;
  }
  function eventFeatures(){
    return api.events.map(e=>pointFeature(e.ll,{show:e.y<=api.year,label:api.lang==='tr'?e.tr:e.en,y:e.y}));
  }
  function spotlightFeatures(z){
    const reasons=api.reasons[z&&z.id]||[];
    if(!z||!reasons.length) return {lines:featureCollection([]),points:featureCollection([])};
    const lines=[], points=[];
    reasons.forEach(r=>{
      const target=r.ll || z.ll;
      lines.push(lineFeature([z.ll,target],{}));
      points.push(pointFeature(target,{label:api.lang==='tr'?r.tr:r.en}));
    });
    return {lines:featureCollection(lines),points:featureCollection(points)};
  }
  function updateSources(){
    if(!ready) return;
    const zones=map.getSource('zones'); if(zones) zones.setData(featureCollection(zoneFeatures()));
    const heat=map.getSource('heat'); if(heat) heat.setData(featureCollection(heatFeatures()));
    const metro=map.getSource('metro'); if(metro) metro.setData(featureCollection(metroFeatures()));
    const stations=map.getSource('metroStations'); if(stations) stations.setData(featureCollection(stationFeatures()));
    const events=map.getSource('events'); if(events) events.setData(featureCollection(eventFeatures()));
    const sp=spotlightFeatures(api.active?api.zones.find(z=>z.id===api.active):null);
    const sl=map.getSource('spotLines'); if(sl) sl.setData(sp.lines);
    const st=map.getSource('spotPoints'); if(st) st.setData(sp.points);
    if(map.getLayer('heat')) map.setLayoutProperty('heat','visibility',api.heat?'visible':'none');
    ['metro-halo','metro-lines','metro-stations'].forEach(id=>{ if(map.getLayer(id)) map.setLayoutProperty(id,'visibility',api.metroOn?'visible':'none'); });
  }
  function set3DView(){
    if(!ready) return;
    const duration=api.reduced?0:700;
    map.easeTo({pitch:48,bearing:-18,duration,essential:true});
    if(map.getLayer('building-extrusions')) map.setLayoutProperty('building-extrusions','visibility','visible');
  }
  function set2DView(){
    if(!ready) return;
    const duration=api.reduced?0:500;
    map.easeTo({pitch:0,bearing:0,duration,essential:true});
    if(map.getLayer('building-extrusions')) map.setLayoutProperty('building-extrusions','visibility','none');
  }
  function setMapView(is3d){
    if(is3d) set3DView(); else set2DView();
  }
  window.setMapView=setMapView;

  function focusZone(id,animate){
    if(!ready) return;
    const z=api.zones.find(q=>q.id===id); if(!z) return;
    map[animate?'flyTo':'jumpTo']({center:z.ll,zoom:Math.max(map.getZoom(),10.5),essential:true,duration:animate?900:0});
  }
  function clearMapSpot(){
    if(!ready) return;
    const l=map.getSource('spotLines'), p=map.getSource('spotPoints');
    if(l) l.setData(featureCollection([])); if(p) p.setData(featureCollection([]));
  }
  function addZoneMarkers(){
    markers.forEach(m=>m.remove()); markers=[];
    api.zones.forEach(z=>{
      const b=document.createElement('button');
      b.type='button'; b.className='zone-g zone-key'; b.dataset.id=z.id; b.setAttribute('aria-label',z.n); b.title=z.n;
      b.addEventListener('click',e=>{e.stopPropagation();window.select(z.id,{spot:true});});
      b.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();window.select(z.id,{spot:true});}});
      markers.push(new maplibregl.Marker({element:b,anchor:'center'}).setLngLat(z.ll).addTo(map));
    });
  }
  function mapZoomStatus(){
    if(!ready) return;
    const zoom=map.getZoom(), base=9.8, scale=Math.pow(2,Math.max(0,zoom-base));
    const badge=document.getElementById('zbadge');
    badge.textContent=scale.toFixed(1)+'×'; badge.style.display=zoom>9.85?'block':'none';
    if(zoom>9.85) document.getElementById('zoomhint').classList.add('gone');
  }
  function installStyle(){
    if(document.getElementById('baku-maplibre-style')) return;
    const s=document.createElement('style'); s.id='baku-maplibre-style'; s.textContent='.zone-key{width:44px;height:44px;padding:0;border:0;border-radius:50%;background:transparent;opacity:0;cursor:pointer}.zone-key:focus-visible{opacity:1;outline:3px solid #c4501f;outline-offset:1px;background:rgba(255,253,248,.5)}'; document.head.appendChild(s);
  }
  function installHooks(){
    if(window.__bakuMapHooks) return;
    window.__bakuMapHooks=true;
    if(typeof baseSelect==='function') window.select=function(id,opts){ const r=baseSelect(id,opts); updateSources(); if(opts&&opts.spot)focusZone(id,true); return r; };
    if(typeof baseSetYear==='function') window.setYear=function(y,a){ const r=baseSetYear(y,a); updateSources(); return r; };
    if(typeof baseSetLang==='function') window.setLang=function(l){ const r=baseSetLang(l); updateSources(); return r; };
    if(typeof baseToggleHeat==='function') window.toggleHeat=function(){ const r=baseToggleHeat(); updateSources(); return r; };
    if(typeof baseToggleMetro==='function') window.toggleMetro=function(){ const r=baseToggleMetro(); updateSources(); return r; };
    if(typeof baseApplyDim==='function') window.applyDim=function(){ const r=baseApplyDim(); updateSources(); return r; };
    if(typeof baseSpotlight==='function') window.spotlight=function(z){ const r=baseSpotlight(z); updateSources(); return r; };
    if(typeof baseClearSpot==='function') window.clearSpot=function(){ const r=baseClearSpot(); clearMapSpot(); return r; };
    if(typeof baseTourGo==='function') window.tourGo=function(i){
      const r=baseTourGo(i); if(ready && i<api.tour.length){ const z=api.zones.find(q=>q.id===api.tour[i].id); if(z)map.easeTo({center:z.ll,zoom:api.tour[i].zoom+8.3,duration:api.reduced?350:1500,essential:true}); } else if(ready){ map.fitBounds(BBOX,{padding:30,duration:api.reduced?0:800}); } return r;
    };
    if(typeof baseEndTour==='function') window.endTour=function(){ const r=baseEndTour(); if(ready)map.fitBounds(BBOX,{padding:30,duration:api.reduced?0:700}); return r; };
    const oldIn=document.getElementById('zIn').onclick, oldOut=document.getElementById('zOut').onclick;
    document.getElementById('zIn').addEventListener('click',()=>{if(ready)map.zoomIn({duration:api.reduced?0:300});});
    document.getElementById('zOut').addEventListener('click',()=>{if(ready)map.zoomOut({duration:api.reduced?0:300});});
    document.getElementById('zReset').addEventListener('click',()=>{if(ready)map.fitBounds(BBOX,{padding:30,duration:api.reduced?0:500});});
  }
  function initialize(){
    maplibregl=window.__BakuMapLibre || maplibregl;
    if(ready || !window.pmtiles || !maplibregl) return;
    try{
      const protocol=new window.pmtiles.Protocol();
      maplibregl.addProtocol('pmtiles',protocol.tile);
      map=new maplibregl.Map({container,style,center:[49.86,40.42],zoom:9.8,minZoom:8.3,maxZoom:14.2,dragRotate:false, pitchWithRotate:false, attributionControl:{compact:true}});
      map.on('zoom',mapZoomStatus); map.on('resize',mapZoomStatus);
      map.on('load',()=>{
        map.on('click','zone-body',e=>{if(e.features&&e.features[0])window.select(e.features[0].properties.id,{spot:true});});
        map.on('mouseenter','zone-body',()=>{map.getCanvas().style.cursor='pointer';});
        map.on('mouseleave','zone-body',()=>{map.getCanvas().style.cursor='';});
        ready=true; stage.classList.add('maplibre-ready'); map.getCanvas().setAttribute('aria-label','Zoomable Baku and Absheron vector map'); map.getCanvas().setAttribute('tabindex','0');
        installStyle(); installHooks(); addZoneMarkers(); updateSources(); setMapView(api.view3d); map.resize(); mapZoomStatus();
        if(api.active)focusZone(api.active,false);
      });
      map.on('error',e=>{if(e&&e.error)console.warn('MapLibre map error',e.error);});
    }catch(e){ console.warn('MapLibre initialization failed; keeping raster fallback.',e); }
  }

  window.addEventListener('baku-maplibre-ready',initialize,{once:true});
  if(window.__bakuMapLibre) initialize();
})();
