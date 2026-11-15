// @ts-check

/** @typedef {Readonly<{position:number,velocity:number}>} HaloSpring */
/** @typedef {Readonly<{x:number,y:number}>} HaloPoint */
/** @typedef {Readonly<{x:HaloSpring,y:HaloSpring,zoom:HaloSpring}>} HaloMotion */
/** @typedef {Readonly<{reset:()=>void,draw:()=>void,settle:()=>void}>} HaloController */

/** @param {number} value @returns {number} */
function haloUnit(value) { return Math.min(1,Math.max(0,value)); }

/** @param {HaloSpring} state @param {number} target @param {number} seconds @returns {HaloSpring} */
function stepHaloSpring(state,target,seconds) {
  const velocity=state.velocity+((target-state.position)*155-state.velocity*20)*seconds;
  return {position:state.position+velocity*seconds,velocity};
}

/** @param {HaloPoint} point @param {HaloPoint} center @returns {HaloPoint} */
function haloRepulsion(point,center) {
  const dx=point.x-center.x,dy=point.y-center.y;
  const distance=Math.hypot(dx,dy);
  if(distance<.1)return {x:0,y:0};
  const force=95*Math.max(0,1-distance/560)**2;
  return {x:dx/distance*force,y:dy/distance*force};
}

/** @param {number} value @returns {number} */
function haloImpulse(value) { return value>=1 ? 1 : 1-Math.exp(-8*value)*(Math.cos(10*value)+.15*Math.sin(10*value)); }

/** @param {number} value @returns {number} */
function haloRecoil(value) { return value>=1 ? 1 : 1-Math.exp(-6.8*value)*(Math.cos(10.8*value)-.18*Math.sin(10.8*value)); }

/** @returns {HaloMotion} */
function restHaloMotion() { return {x:{position:0,velocity:0},y:{position:0,velocity:0},zoom:{position:1,velocity:0}}; }

/** @returns {HaloController} */
function mountHaloField() {
  const svg=document.querySelector('#recruitment-halo');
  const composition=document.querySelector('.halo-composition');
  const centering=document.querySelector('.halo-centering');
  const core=document.querySelector('.halo-core');
  const drafting=document.querySelector('.halo-drafting');
  const shock=document.querySelector('.halo-shockwave');
  const pen=document.querySelector('#halo-drawing-pen');
  const material=document.querySelector('#halo-material-trace');
  if(!(svg instanceof SVGSVGElement) || !(composition instanceof HTMLElement) || !(centering instanceof SVGElement) || !(core instanceof SVGElement) || !(drafting instanceof SVGElement) || !(shock instanceof SVGElement) || !(pen instanceof SVGElement) || !(material instanceof SVGPathElement)) throw new TypeError('The halo requires its sculpture, drawing path, pen and shockwave.');
  const pieces=[...svg.querySelectorAll('.halo-field-piece')].map(node=>{
    if(!(node instanceof SVGElement))throw new TypeError('Halo field pieces must be SVG elements.');
    const x=Number(node.dataset.haloX),y=Number(node.dataset.haloY);
    if(!Number.isFinite(x)||!Number.isFinite(y))throw new RangeError('A halo piece has invalid projected coordinates.');
    return {node,x,y,centered:centering.contains(node)};
  });
  const shards=[...svg.querySelectorAll('.halo-fragment')].map(node=>{
    if(!(node instanceof SVGElement))throw new TypeError('Halo fragments must be SVG groups.');
    const css=getComputedStyle(node);
    const values=['--fx','--fy','--fr','--fs','--fd'].map(name=>Number.parseFloat(css.getPropertyValue(name)));
    if(values.some(value=>!Number.isFinite(value)))throw new RangeError('A halo fragment has invalid burst geometry.');
    return {node,x:values[0],y:values[1],angle:values[2],scale:values[3],delay:values[4]*1000};
  });
  const traces=[...svg.querySelectorAll('.draft-trace,.draft-depth')];
  const cards=[...composition.querySelectorAll('[data-halo-card]')].map(node=>{
    if(!(node instanceof HTMLElement))throw new TypeError('Halo reading targets must be HTML elements.');
    return node;
  });
  const centerStyle=getComputedStyle(centering);
  const offsets=['--closed-x','--closed-y','--open-x','--open-y'].map(name=>Number.parseFloat(centerStyle.getPropertyValue(name)));
  if(offsets.some(value=>!Number.isFinite(value)))throw new RangeError('The halo requires finite centering offsets.');
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const narrow=matchMedia('(max-width:900px)');
  const pathLength=material.getTotalLength();
  let elapsed=0,lastTime=0,frame=0,visible=true,suspended=false;
  let phase='waiting';
  let selected=-1;
  let measured=false;
  let unitScale=1;
  /** @type {ReadonlyArray<HaloMotion>} */
  let pieceMotion=pieces.map(restHaloMotion),cardMotion=cards.map(restHaloMotion);
  /** @type {ReadonlyArray<HaloPoint>} */
  let pieceAnchors=[],cardAnchors=[];
  /** @type {ReadonlyArray<number>} */
  let cardWidths=[];

  /** @param {string} next @returns {void} */
  function setPhase(next) { phase=next;document.body.dataset.haloPhase=next; }
  /** @returns {void} */
  function measureField() {
    const matrix=svg.getScreenCTM();
    if(!matrix || matrix.a<=0)throw new RangeError('The halo needs a positive SVG screen scale.');
    unitScale=matrix.a;
    pieceAnchors=pieces.map(piece=>({x:matrix.e+(piece.x+(piece.centered?offsets[2]:0))*matrix.a,y:matrix.f+(piece.y+(piece.centered?offsets[3]:0))*matrix.d}));
    cardAnchors=cards.map((node,index)=>{
      const box=node.getBoundingClientRect();
      return {x:box.x+box.width/2-cardMotion[index].x.position,y:box.y+box.height/2-cardMotion[index].y.position};
    });
    cardWidths=cards.map(node=>node.offsetWidth);
    measured=true;
  }
  /** @param {number} time @returns {void} */
  function renderSequence(time) {
    const building=haloUnit((time-240)/660);
    const burst=Math.max(0,time-1140);
    setPhase(time<900?'drawing':time<1140?'trembling':time<2190?'bursting':'floating');
    material.style.strokeDashoffset=String(1-building);
    material.style.strokeDasharray='1';
    for(let index=0;index<traces.length;index+=1) {
      const trace=traces[index];
      if(trace instanceof SVGElement)trace.style.strokeDashoffset=String(1-haloUnit((time-index*110)/630));
    }
    const point=material.getPointAtLength(pathLength*haloUnit(time/800));
    pen.setAttribute('cx',String(point.x));pen.setAttribute('cy',String(point.y));
    drafting.style.opacity=String(haloUnit(time/90)*(1-haloUnit(burst/260)));
    pen.style.opacity=time<850?'1':'0';
    core.style.opacity=String(haloUnit((time-240)/160));
    core.style.mask=time<1140?'url(#halo-build-mask)':'none';
    const tension=haloUnit((time-900)/240);
    const tremor=Math.sin(tension*Math.PI)*2.1;
    core.style.transform=time>=900&&time<1140?`translate(${Math.sin(time*.19)*tremor}px,${Math.cos(time*.23)*tremor*.65}px) rotate(${Math.sin(time*.15)*tremor*.2}deg)`:'none';
    const centerProgress=haloRecoil(haloUnit(burst/820));
    centering.style.transform=`translate(${offsets[2]*centerProgress}px,${offsets[3]*centerProgress}px)`;
    for(const shard of shards) {
      const progress=haloImpulse(haloUnit((burst-shard.delay)/960));
      shard.node.style.transform=`translate(${shard.x*progress}px,${shard.y*progress}px) rotate(${shard.angle*progress}deg) scale(${1+(shard.scale-1)*progress})`;
    }
    shock.style.opacity=String(burst>0?.38*(1-haloUnit(burst/500)):0);
    shock.style.transform=`scale(${1+haloUnit(burst/500)*.7})`;
  }
  /** @param {number} seconds @returns {void} */
  function renderField(seconds) {
    if(!measured)measureField();
    const floating=haloUnit((elapsed-1200)/700);
    const drift=(elapsed-1140)/1000;
    const active=selected>=0?cardAnchors[selected]:null;
    pieceMotion=pieces.map((piece,index)=>{
      const push=active?haloRepulsion(pieceAnchors[index],active):{x:0,y:0};
      const amplitude=index===0?4:9+index%3*2;
      const x=(Math.sin(drift*.72+index*2.4)*amplitude+push.x/unitScale)*floating;
      const y=(Math.sin(drift*.57+index*1.7)*amplitude*.85+push.y/unitScale)*floating;
      const next={x:stepHaloSpring(pieceMotion[index].x,x,seconds),y:stepHaloSpring(pieceMotion[index].y,y,seconds),zoom:pieceMotion[index].zoom};
      piece.node.style.transform=`translate(${next.x.position}px,${next.y.position}px)`;
      return next;
    });
    const arrival=haloUnit((elapsed-1230)/500);
    cardMotion=cards.map((node,index)=>{
      const focused=index===selected;
      const push=active&&!focused?haloRepulsion(cardAnchors[index],active):{x:0,y:0};
      const zoom=focused?(narrow.matches?1.065:1.16):1;
      const x=Math.min(innerWidth-12-cardAnchors[index].x-cardWidths[index]*zoom/2,Math.max(12-cardAnchors[index].x+cardWidths[index]*zoom/2,push.x+(focused?0:Math.sin(drift*.64+index)*2.5*floating)));
      const y=push.y+(focused?0:Math.sin(drift*.79+index*1.8)*3.5*floating)+(1-arrival)*14;
      const next={x:stepHaloSpring(cardMotion[index].x,x,seconds),y:stepHaloSpring(cardMotion[index].y,y,seconds),zoom:stepHaloSpring(cardMotion[index].zoom,zoom,seconds)};
      node.style.translate=`${next.x.position}px ${next.y.position}px`;
      node.style.scale=String(next.zoom.position);
      node.style.opacity=String(arrival);
      node.dataset.haloActive=String(focused);
      return next;
    });
  }
  /** @param {number} time @returns {void} */
  function tick(time) {
    const seconds=lastTime?Math.min((time-lastTime)/1000,.032):1/60;
    lastTime=time;elapsed+=seconds*1000;
    if(phase!=='floating')renderSequence(elapsed);
    renderField(seconds);
    frame=requestAnimationFrame(tick);
  }
  /** @returns {void} */
  function synchronizeField() {
    cancelAnimationFrame(frame);frame=0;lastTime=0;
    if(phase!=='waiting'&&!reduce.matches&&!suspended&&visible&&!document.hidden&&document.body.dataset.motionState!=='paused')frame=requestAnimationFrame(tick);
  }
  /** @returns {void} */
  function resetField() {
    cancelAnimationFrame(frame);frame=0;lastTime=0;elapsed=0;selected=-1;
    pieceMotion=pieces.map(restHaloMotion);cardMotion=cards.map(restHaloMotion);
    for(const piece of pieces)piece.node.style.transform='none';
    for(const node of cards){node.style.translate='0px 0px';node.style.scale='1';node.style.opacity='0';node.dataset.haloActive='false';}
    measured=false;renderSequence(0);setPhase('waiting');
  }
  /** @returns {void} */
  function settleField() {
    resetField();elapsed=2190;renderSequence(elapsed);
    for(const node of cards)node.style.opacity='1';
    synchronizeField();
  }
  /** @returns {void} */
  function drawField() { if(reduce.matches){settleField();return;} elapsed=0;setPhase('drawing');synchronizeField(); }
  /** @param {number} index @returns {void} */
  function selectCard(index) {
    if(phase!=='floating')return;
    selected=index;measured=false;
    if(reduce.matches||document.body.dataset.motionState==='paused') {
      for(let i=0;i<cards.length;i+=1){cards[i].style.scale=i===index?'1.05':'1';cards[i].dataset.haloActive=String(i===index);}
    }
  }
  cards.forEach((node,index)=>{
    let touchSelection=-1;
    node.addEventListener('pointerdown',event=>{if(event.pointerType==='touch')touchSelection=selected;});
    node.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse')selectCard(index);});
    node.addEventListener('pointerleave',()=>{if(!node.matches(':focus-visible')&&!node.querySelector(':focus-visible'))selectCard(-1);});
    node.addEventListener('focusin',()=>selectCard(index));
    node.addEventListener('focusout',event=>{if(!(event.relatedTarget instanceof Node)||!node.contains(event.relatedTarget))selectCard(-1);});
    node.addEventListener('pointerup',event=>{if(event.pointerType==='touch'&&!(event.target instanceof Element&&event.target.closest('a,button')))selectCard(touchSelection===index?-1:index);});
  });
  document.addEventListener('pointerdown',event=>{if(event.target instanceof Node&&!cards.some(node=>node.contains(event.target)))selectCard(-1);});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')selectCard(-1);});
  const viewport=new IntersectionObserver(entries=>{visible=entries.some(entry=>entry.isIntersecting);synchronizeField();},{threshold:0});
  viewport.observe(composition);
  const resize=new ResizeObserver(()=>{measured=false;});resize.observe(composition);
  window.addEventListener('resize',()=>{measured=false;});
  window.addEventListener('scroll',()=>{measured=false;},{passive:true});
  const preferences=new MutationObserver(synchronizeField);
  preferences.observe(document.body,{attributes:true,attributeFilter:['data-motion-state']});
  reduce.addEventListener('change',()=>{if(reduce.matches)settleField();else synchronizeField();});
  document.addEventListener('visibilitychange',synchronizeField);
  window.addEventListener('pagehide',()=>{suspended=true;synchronizeField();});
  window.addEventListener('pageshow',()=>{suspended=false;measured=false;synchronizeField();});
  resetField();
  return Object.freeze({reset:resetField,draw:drawField,settle:settleField});
}
