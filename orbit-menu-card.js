// Orbit Menu Card — standalone HACS frontend resource, MIT.
export const VERSION = '0.1.7';
const number = (v, fallback, min, max) => {
  const n = v === undefined ? fallback : Number(v);
  if (!Number.isFinite(n) || n < min || n > max) throw new Error(`Value must be between ${min} and ${max}`);
  return n;
};
export function normalizeConfig(raw) {
  const mode = raw.mode || 'menu';
  const layout = raw.layout || 'auto';
  if (!['select', 'menu', 'menu-open', 'pin'].includes(mode)) throw new Error('mode: select, menu, menu-open or pin');
  if (!['auto', 'circle', 'fan', 'arc'].includes(layout)) throw new Error('layout: auto, circle, fan or arc');
  if(mode==='pin'){if(!/^alarm_control_panel\.[a-z0-9_]+$/.test(raw.entity||''))throw new Error('PIN requires alarm_control_panel entity');raw={...raw,items:[...Array.from({length:10},(_,i)=>({id:String(i),value:String(i),name:String(i),icon:'mdi:numeric-'+i})),{id:'erase',name:'Стереть',icon:'mdi:backspace-outline'},{id:'submit',name:'Снять охрану',icon:'mdi:shield-check-outline'}],show_labels:false};}
  const position=raw.menu_position?.preset||(mode==='pin'?'center':'trigger');if(!['trigger','center','top-left','top-right','bottom-left','bottom-right','custom'].includes(position))throw new Error('Invalid menu position');
  const pinLength=number(raw.pin?.length,4,4,8);if(!Number.isInteger(pinLength))throw new Error('PIN length must be an integer');
  if (!Array.isArray(raw.items) || raw.items.length < 1 || raw.items.length > 12) throw new Error('Provide 1–12 items');
  if (raw.entity && mode === 'select' && !/^(input_select|select)\./.test(raw.entity)) throw new Error('Select entity must be input_select.* or select.*');
  const items = raw.items.map((item, i) => ({...item, id:String(item.id ?? item.value ?? i), value:String(item.value ?? item.name ?? i), name:String(item.name ?? item.value ?? `Item ${i + 1}`), icon:item.icon || 'mdi:circle-outline'}));
  if (new Set(items.map(i => i.id)).size !== items.length) throw new Error('Item ids must be unique');
  if (mode === 'select' && new Set(items.map(i => i.value)).size !== items.length) throw new Error('Select values must be unique');
  const flights=['burst','clockwise','counterclockwise','spiral-clockwise','spiral-counterclockwise'];
  if(raw.animation?.open&&!flights.includes(raw.animation.open))throw new Error('Invalid opening animation');
  if(raw.animation?.close&&!['reverse',...flights].includes(raw.animation.close))throw new Error('Invalid closing animation');
  return {...raw, mode, layout, items, name:raw.name || 'Меню', icon:raw.icon || 'mdi:dots-grid',
    radius:number(raw.radius,mode==='pin'?260:160,90,480), button_size:number(raw.button_size,72,40,120), item_size:number(raw.item_size,60,40,100),
    show_labels:raw.show_labels !== false,
    menu_position:{preset:position,x:number(raw.menu_position?.x,50,0,100),y:number(raw.menu_position?.y,50,0,100)},pin:{length:pinLength,auto_submit:raw.pin?.auto_submit!==false,sound:raw.pin?.sound!==false,icons:{locked:raw.pin?.icons?.locked||'mdi:shield-lock-outline',unlocked:raw.pin?.icons?.unlocked||'mdi:shield-off-outline',unavailable:raw.pin?.icons?.unavailable||'mdi:shield-alert-outline'}},
    backdrop:{opacity:number(raw.backdrop?.opacity,.45,0,1),blur:number(raw.backdrop?.blur,8,0,24)},
    animation:{open:raw.animation?.open||'clockwise',close:raw.animation?.close||'reverse',duration:number(raw.animation?.duration,260,0,1000),stagger:number(raw.animation?.stagger,24,0,120)}};
}

export function menuAnchor(position,trigger,width,height){
  const preset=position.preset;if(preset==='trigger')return trigger;
  const x=preset==='custom'?position.x/100:preset.includes('left')?.25:preset.includes('right')?.75:.5;
  const y=preset==='custom'?position.y/100:preset.startsWith('top')?.25:preset.startsWith('bottom')?.75:.5;
  return {x:x*width,y:y*height};
}
export function pinStateIcon(state,icons){return !state||['unknown','unavailable'].includes(state)?icons.unavailable:state==='disarmed'?icons.unlocked:icons.locked;}
export function pinEdit(value,key,length){if(key==='erase')return value.slice(0,-1);if(/^\d$/.test(key)&&value.length<length)return value+key;return value;}
export function radialLayout({x,y,width,height,count,radius=160,itemSize=60,buttonSize=72,labels=true,layout='auto'}) {
  const margin=12, labelWidth=labels?128:itemSize, boxWidth=Math.max(itemSize,labelWidth), boxHeight=itemSize+(labels?36:0);
  const toward=Math.atan2(height/2-y,width/2-x)*180/Math.PI;
  const kinds=layout==='auto'?['circle','fan','arc']:[layout];
  const usable=(points)=>points.every(p=>p.x-boxWidth/2>=margin&&p.x+boxWidth/2<=width-margin&&p.y-itemSize/2>=margin&&p.y+boxHeight-itemSize/2<=height-margin)&&points.every((p,i)=>points.slice(i+1).every(q=>Math.abs(p.x-q.x)>=boxWidth+6||Math.abs(p.y-q.y)>=boxHeight+6))&&points.every(p=>Math.hypot(p.x-x,p.y-y)>=(buttonSize+itemSize)/2+12);
  for (const kind of kinds) {
    for(const span of (kind==='circle'?[360]:kind==='fan'?[180,160]:[90,80,70,60])) {
    for(let r=radius;r<=Math.max(width,height);r+=12) {
      // Rotate inward without moving the actual trigger anchor.
      const orientations=kind==='circle'?[-90]:Array.from({length:73},(_,i)=>toward+(i===0?0:Math.ceil(i/2)*5*(i%2?1:-1)));
      for(const center of orientations) {
        const points=Array.from({length:count},(_,i)=>{const degrees=kind==='circle'?center+i*360/count:count===1?center:center-span/2+i*span/(count-1);const angle=degrees*Math.PI/180;return {x:x+Math.cos(angle)*r,y:y+Math.sin(angle)*r,angle:degrees};});
        if(usable(points)) return {kind,radius:r,points,anchor:{x,y}};
      }
    }
  }
  }
  throw new Error('Недостаточно места. Уменьшите размер кнопок или число пунктов.');
}
export function safeUrl(path,external=false) {
  if(typeof path!=='string'||!path.trim()) throw new Error('Не указан адрес');
  if(!external) {if(!path.startsWith('/')||path.startsWith('//'))throw new Error('Навигация: нужен локальный путь /…');return path;}
  const url=new URL(path,globalThis.location?.href||'https://example.invalid');
  if(!['http:','https:'].includes(url.protocol))throw new Error('Разрешены только HTTP/HTTPS ссылки');
  return url.href;
}
// Decoration uses exactly the same anchor, radius and angles as the buttons.
export function orbitDecoration(geometry,{button_size=72,item_size=60,show_labels=true}={}) {
  const {anchor,radius,points,kind}=geometry;
  const at=(angle,r)=>({x:anchor.x+Math.cos(angle)*r,y:anchor.y+Math.sin(angle)*r});
  const angles=points.map(p=>p.angle*Math.PI/180),spokeDots=[],orbitDots=[];
  const start=button_size/2+12,end=radius-item_size/2-12;
  for(const angle of angles){const count=Math.max(0,Math.floor((end-start)/9));for(let i=0;i<=count&&end>=start;i++)spokeDots.push(at(angle,count?start+i*(end-start)/count:start));}
  for(let i=0;i<angles.length-(kind==='circle'?0:1);i++){const next=i+1<angles.length?angles[i+1]:angles[0]+2*Math.PI;orbitDots.push(at((angles[i]+next)/2,radius));}
  return {arc:{start:kind==='circle'?0:angles[0],end:kind==='circle'?Math.PI*2:angles.at(-1)},spokeDots:show_labels?spokeDots.filter(dot=>!points.some(p=>dot.x>=p.x-67&&dot.x<=p.x+67&&dot.y>=p.y+item_size/2+5&&dot.y<=p.y+item_size/2+53)):spokeDots,orbitDots};
}
export function resolveFlight(name,openingName='clockwise') {
  if(name==='reverse'){const flips={burst:'burst',clockwise:'counterclockwise',counterclockwise:'clockwise','spiral-clockwise':'spiral-counterclockwise','spiral-counterclockwise':'spiral-clockwise'};return flips[openingName];}
  return name;
}
export function flightFrames(point,anchor,{opening=true,spiral=false,direction=1,basePoint=point,startScale=1,startOpacity=1,angularBounds}={}) {
  const dx=point.x-anchor.x,dy=point.y-anchor.y,frames=[];
  let sweep=Math.PI*2;if(angularBounds){let base=Math.atan2(dy,dx);while(base<angularBounds.start)base+=Math.PI*2;while(base>angularBounds.end)base-=Math.PI*2;const negative=opening?direction>0:direction<0;sweep=Math.max(0,negative?base-angularBounds.start:angularBounds.end-base);}
  for(let i=0;i<=32;i++){const t=i/32,r=opening?t:1-t,angle=spiral?direction*(opening?t-1:t)*sweep:0;
    const x=anchor.x+(dx*Math.cos(angle)-dy*Math.sin(angle))*r,y=anchor.y+(dx*Math.sin(angle)+dy*Math.cos(angle))*r;
    const scale=opening?.22+.78*t:startScale*(1-.78*t);
    frames.push({transform:`translate(-50%,-50%) translate(${x-basePoint.x}px,${y-basePoint.y}px) scale(${scale})`,opacity:opening?t:startOpacity*(1-t),offset:t});}
  return frames;
}
const element=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
const icon=(name)=>{const node=element('ha-icon');node.setAttribute('icon',name);return node;};
const dispatch=(node,name,detail)=>node.dispatchEvent(new CustomEvent(name,{detail,bubbles:true,composed:true}));
const Base=globalThis.HTMLElement||class {};
const sharedCss=`*{box-sizing:border-box}button{font:inherit;cursor:pointer;color:#dceef5;background:#092b38;border:2px solid #48c7ef;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0}button:hover{background:#15485a}button:focus-visible{outline:3px solid #dceef5;outline-offset:4px}button:disabled{cursor:wait;opacity:.6}ha-icon{--mdc-icon-size:30px;color:#dceef5;pointer-events:none}button.selected{background:#48c7ef;color:#062734}button.selected ha-icon{color:#062734}`;
const cardCss=sharedCss+`:host{display:block;font-family:var(--primary-font-family,Roboto,sans-serif)}.card{width:260px;max-width:100%;display:flex;align-items:center;gap:14px;padding:12px;background:transparent;min-height:96px}.trigger{width:var(--size);height:var(--size)}.name{flex:1;min-width:0;overflow-wrap:anywhere;color:var(--primary-text-color,#dceef5);font-size:18px}.error{font-size:14px;color:#ffbd44;max-width:38ch}.hidden{visibility:hidden}`;
const overlayCss=sharedCss+`.pin-field{position:absolute;transform:translate(-50%,-50%);display:flex;gap:8px;z-index:4;padding:6px;background:#062734;border-radius:12px;outline:none}.pin-slot{display:flex;align-items:center;justify-content:center;width:40px;height:40px;border:1px solid #276079;border-radius:7px;background:#092b38;color:#dceef5;font:26px monospace}.pin-slot.active,.pin-slot.filled{border-color:#48c7ef}.pin-field:focus-visible{outline:1px solid #48c7ef;outline-offset:5px}.pin-success{--result:#49d98a}.pin-error{--result:#ff6675}.pin-success .item,.pin-error .item{border-color:var(--result);box-shadow:0 0 16px color-mix(in srgb,var(--result) 25%,transparent)}.pin-success .item ha-icon,.pin-error .item ha-icon{color:var(--result)}.pin-success .pin-slot,.pin-error .pin-slot{border-color:var(--result);color:var(--result);background:color-mix(in srgb,var(--result) 14%,#092b38)}.pin-success .pin-field,.pin-error .pin-field{outline-color:var(--result)}.pin-error .pin-field{animation:pin-shake .4s ease}.pin-success .pin-field{animation:pin-pulse .6s ease}.pin-success .status{color:#49d98a}.pin-error .status{color:#ff6675}@keyframes pin-shake{0%,100%{transform:translate(-50%,-50%)}20%,60%{transform:translate(calc(-50% - 8px),-50%)}40%,80%{transform:translate(calc(-50% + 8px),-50%)}}@keyframes pin-pulse{50%{transform:translate(-50%,-50%) scale(1.06)}}@media(prefers-reduced-motion:reduce){.pin-field{animation:none!important}}:host{position:fixed;inset:0;font-family:var(--primary-font-family,Roboto,sans-serif)}dialog{position:fixed;inset:0;margin:0;padding:0;border:0;width:100vw;height:100vh;max-width:none;max-height:none;background:transparent;color:#dceef5;overflow:hidden;touch-action:none}dialog::backdrop{background:rgba(0,0,0,var(--dim));backdrop-filter:blur(var(--blur));-webkit-backdrop-filter:blur(var(--blur))}.anchor,.item{position:absolute;transform:translate(-50%,-50%)}.anchor[hidden]{display:none}.anchor{width:var(--size);height:var(--size);z-index:3}.item{width:var(--item-size);height:var(--item-size);z-index:2;will-change:transform,opacity}.label{position:absolute;top:calc(100% + 8px);left:50%;transform:translateX(-50%);width:128px;text-align:center;color:#dceef5;font-size:17px;line-height:1.25;pointer-events:none;overflow-wrap:anywhere;max-height:42px;overflow:hidden}.orbit{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:.9;transition:opacity var(--duration) ease}.status{position:absolute;left:24px;bottom:24px;color:#ffbd44;background:#062734;padding:12px 18px;border-radius:12px;max-width:min(600px,90vw);font-size:16px}.enter .item{transform:translate(-50%,-50%) translate(var(--from-x),var(--from-y)) scale(.22);opacity:0}.enter .orbit,.leaving .orbit{opacity:0}@media(prefers-reduced-motion:reduce){.item,.orbit{transition:none!important}}`;
class OrbitOverlay extends Base {
  constructor(){super();this.attachShadow({mode:'open'});}
  open(owner) {
    this.owner=owner;const c=owner.config;
    this.shadowRoot.append(element('style','',overlayCss));this.dialog=element('dialog','enter');
    this.dialog.setAttribute('aria-label',c.name);this.dialog.setAttribute('aria-modal','true');
    this.dialog.style.setProperty('--dim',c.backdrop.opacity);this.dialog.style.setProperty('--blur',`${c.backdrop.blur}px`);
    this.dialog.style.setProperty('--size',`${c.button_size}px`);this.dialog.style.setProperty('--item-size',`${c.item_size}px`);this.dialog.style.setProperty('--duration',`${c.animation.duration}ms`);
    this.group=element('div','items');if(c.mode==='select'){this.group.setAttribute('role','radiogroup');this.group.setAttribute('aria-label',c.name);}this.dialog.append(this.group);this.anchor=element('button','anchor');this.anchor.type='button';this.anchor.hidden=c.mode==='pin';this.anchor.setAttribute('aria-label','Закрыть меню');this.anchor.append(icon('mdi:close'));
    this.anchor.addEventListener('click',()=>this.close());this.dialog.append(this.anchor);
    if(c.mode==='pin'){
      this.code='';this.pinField=element('div','pin-field');this.pinField.tabIndex=0;this.pinField.setAttribute('role','group');this.pinField.setAttribute('aria-label','PIN, '+c.pin.length+' цифр');
      this.pinSlots=Array.from({length:c.pin.length},()=>{const slot=element('span','pin-slot');slot.setAttribute('aria-hidden','true');this.pinField.append(slot);return slot;});this.dialog.append(this.pinField);
    }
    this.dialog.addEventListener('click',e=>{if(e.target===this.dialog)this.close();});
    this.dialog.addEventListener('cancel',e=>{e.preventDefault();this.close();});
    this.dialog.addEventListener('wheel',e=>e.preventDefault(),{passive:false});
    this.dialog.addEventListener('keydown',e=>this.onKey(e));
    this.shadowRoot.append(this.dialog);this.position();this.dialog.showModal();
    owner.trigger.classList.add('hidden');owner.trigger.setAttribute('aria-expanded','true');
    requestAnimationFrame(()=>requestAnimationFrame(()=>{if(!this.isConnected||this.closing)return;this.dialog.classList.remove('enter');this.play(true);(this.pinField||this.anchor).focus();}));
    this.resize=()=>{if(this.closing)return;try{this.position();}catch(e){this.showError(e.message);this.close();}};
    window.addEventListener('resize',this.resize);window.visualViewport?.addEventListener('resize',this.resize);
  }
  position() {
    this.animations?.forEach(a=>a.cancel());this.animations=[];
    const owner=this.owner,c=owner.config,rect=owner.trigger.getBoundingClientRect();
    this.origin={x:rect.x+rect.width/2,y:rect.y+rect.height/2};const {x,y}=menuAnchor(c.menu_position,this.origin,window.innerWidth,window.innerHeight);
    this.geometry=radialLayout({x,y,width:window.innerWidth,height:window.innerHeight,count:c.items.length,radius:c.radius,itemSize:c.item_size,buttonSize:c.mode==='pin'?Math.max(240,c.pin.length*48):c.button_size,labels:c.show_labels,layout:c.layout});
    this.anchor.style.left=`${this.origin.x}px`;this.anchor.style.top=`${this.origin.y}px`;
    if(this.pinField){this.pinField.style.left=`${x}px`;this.pinField.style.top=`${y}px`;}
    const focused=this.shadowRoot.activeElement?.dataset?.item;
    this.dialog.querySelectorAll('.item,.orbit').forEach(n=>n.remove());
    this.drawDecoration();
    this.buttons=c.items.map((item,i)=>{
      const p=this.geometry.points[i],b=element('button','item');b.type='button';b.disabled=owner.pending;b.dataset.item=item.id;b.setAttribute('aria-label',item.name);b.style.left=`${p.x}px`;b.style.top=`${p.y}px`;b.style.setProperty('--from-x',`${this.origin.x-p.x}px`);b.style.setProperty('--from-y',`${this.origin.y-p.y}px`);b.style.setProperty('--delay',`${i*c.animation.stagger}ms`);b.append(icon(item.icon));
      if(c.mode==='select'){b.setAttribute('role','radio');b.setAttribute('aria-checked',String(owner.currentValue()===item.value));}
      if(owner.currentValue()===item.value&&c.mode==='select')b.classList.add('selected');
      if(c.show_labels)b.append(element('span','label',item.name));
      b.addEventListener('click',()=>c.mode==='pin'?this.pinKey(item.id):owner.choose(item,this));this.group.append(b);return b;
    });
    if(focused)this.buttons.find(b=>b.dataset.item===focused)?.focus();
  }
  play(opening){
    const c=this.owner.config,positions=this.buttons.map(b=>{const rect=b.getBoundingClientRect();return {x:rect.x+rect.width/2,y:rect.y+rect.height/2,scale:Math.min(1,rect.width/c.item_size),opacity:Number(getComputedStyle(b).opacity)};});
    this.animations?.forEach(a=>a.cancel());this.animations=[];
    if(matchMedia('(prefers-reduced-motion: reduce)').matches||!c.animation.duration)return Promise.resolve();
    const preset=resolveFlight(opening?c.animation.open:c.animation.close,c.animation.open),backward=preset.includes('counterclockwise');
    this.buttons.forEach((b,i)=>{if(typeof b.animate!=='function')return;
      const target=this.geometry.points[i],point=opening?target:positions[i];
      const frames=flightFrames(point,this.origin,{opening,spiral:preset.startsWith('spiral-'),direction:backward?-1:1,basePoint:target,startScale:point.scale||1,startOpacity:point.opacity??1,angularBounds:this.geometry.kind==='circle'||c.menu_position.preset!=='trigger'?undefined:{start:this.geometry.points[0].angle*Math.PI/180,end:this.geometry.points.at(-1).angle*Math.PI/180}});
      const order=backward?this.buttons.length-1-i:i,delay=preset==='burst'?0:order*c.animation.stagger;
      const a=b.animate(frames,{duration:c.animation.duration,delay,easing:opening?'cubic-bezier(.18,.8,.25,1)':'ease-in',fill:'both'});this.animations.push(a);
    });
    const flights=[...this.animations];return Promise.all(flights.map(a=>a.finished.catch(()=>{}))).then(()=>{if(opening)flights.forEach(a=>a.cancel());});
  }
  drawDecoration(){
    const canvas=element('canvas','orbit');canvas.setAttribute('aria-hidden','true');
    const ratio=Math.min(window.devicePixelRatio||1,3);canvas.width=Math.ceil(window.innerWidth*ratio);canvas.height=Math.ceil(window.innerHeight*ratio);
    this.dialog.prepend(canvas);const ctx=canvas.getContext('2d');if(!ctx)return;ctx.scale(ratio,ratio);
    const g=this.geometry,d=orbitDecoration(g,this.owner.config);ctx.strokeStyle=this.feedbackState==='success'?'#49d98a':this.feedbackState==='error'?'#ff6675':'#276079';ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(g.anchor.x,g.anchor.y,g.radius,d.arc.start,d.arc.end);ctx.stroke();
    ctx.fillStyle=this.feedbackState==='success'?'#49d98a':this.feedbackState==='error'?'#ff6675':'#48c7ef';for(const dot of d.spokeDots){ctx.beginPath();ctx.arc(dot.x,dot.y,1.7,0,Math.PI*2);ctx.fill();}
    for(const dot of d.orbitDots){ctx.beginPath();ctx.arc(dot.x,dot.y,3.2,0,Math.PI*2);ctx.fill();}
  }
  renderPin(){this.pinSlots?.forEach((slot,i)=>{slot.textContent=i<this.code.length?'*':'';slot.classList.toggle('filled',i<this.code.length);slot.classList.toggle('active',i===this.code.length);});this.pinField?.setAttribute('aria-label',`PIN: введено ${this.code.length} из ${this.owner.config.pin.length}`);}
  unlockSound(){if(!this.owner.config.pin.sound||this.audio)return;try{const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(Audio){this.audio=new Audio();this.audio.resume().catch(()=>{});}}catch{}}
  tone(success){if(!this.audio||this.audio.state!=='running')return;try{const start=this.audio.currentTime;const notes=success?[660,880]:[220,165];notes.forEach((frequency,i)=>{const oscillator=this.audio.createOscillator(),gain=this.audio.createGain(),time=start+i*.13;oscillator.type='sine';oscillator.frequency.value=frequency;gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(.08,time+.015);gain.gain.exponentialRampToValueAtTime(.001,time+.16);oscillator.connect(gain);gain.connect(this.audio.destination);oscillator.start(time);oscillator.stop(time+.17);});}catch{}}
  async pinResult(success,message){if(!this.isConnected||this.closing)return;clearTimeout(this.pinTimer);this.awaitingDisarm=false;this.busy(true);this.feedbackState=success?'success':'error';this.dialog.classList.remove('pin-success','pin-error');this.dialog.classList.add('pin-'+this.feedbackState);this.drawFeedback();this.showError(message);this.tone(success);
    await new Promise(resolve=>{this.feedbackResolve=resolve;this.feedbackTimer=setTimeout(resolve,success?750:650);});this.feedbackResolve=null;
    if(!this.isConnected||this.closing)return;if(success){await this.close();}else{this.code='';this.renderPin();this.dialog.classList.remove('pin-error');this.feedbackState=null;this.drawFeedback();this.owner.pending=false;this.owner.update();this.busy(false);this.pinField.focus();}
  }
  drawFeedback(){this.dialog.querySelector('.orbit')?.remove();this.drawDecoration();}
  pinKey(key){if(this.owner.pending||this.closing)return;this.unlockSound();if(key==='submit'){this.owner.submitPin(this);return;}this.dialog.querySelector('.status')?.remove();this.code=pinEdit(this.code,key,this.owner.config.pin.length);this.renderPin();if(this.owner.config.pin.auto_submit&&this.code.length===this.owner.config.pin.length)this.owner.submitPin(this);}
  onKey(e){if(this.owner.config.mode==='pin'&&(/^\d$/.test(e.key)||['Backspace','Delete','Enter'].includes(e.key))){e.preventDefault();this.pinKey(e.key==='Enter'?'submit':['Backspace','Delete'].includes(e.key)?'erase':e.key);return;}
if(!['ArrowRight','ArrowLeft','ArrowUp','ArrowDown','Home','End'].includes(e.key))return;e.preventDefault();const index=this.buttons.indexOf(this.shadowRoot.activeElement);let next=index;if(e.key==='Home')next=0;else if(e.key==='End')next=this.buttons.length-1;else {const forward=['ArrowRight','ArrowDown'].includes(e.key);next=index<0?(forward?0:this.buttons.length-1):(index+(forward?1:-1)+this.buttons.length)%this.buttons.length;}this.buttons[next].focus();}
  showError(message){let node=this.dialog.querySelector('.status');if(!node){node=element('div','status');node.setAttribute('role','alert');this.dialog.append(node);}node.textContent=message;}
  busy(flag){this.buttons?.forEach(b=>b.disabled=flag);}
  async close(immediate=false){if(this.closing)return;this.closing=true;const flight=immediate?Promise.resolve():this.play(false);this.dialog?.classList.add('leaving');if(!immediate)await flight;this.animations?.forEach(a=>a.cancel());this.dialog?.close();this.cleanup();const owner=this.owner;const active=owner.overlay===this;this.remove();if(active){owner.overlay=null;owner.trigger.classList.remove('hidden');owner.trigger.setAttribute('aria-expanded','false');if(owner.isConnected)owner.trigger.focus();}}
  cleanup(){if(this.owner?.config.mode==='pin'){this.owner.pending=false;this.owner.update();}clearTimeout(this.pinTimer);clearTimeout(this.feedbackTimer);this.feedbackResolve?.();this.audio?.close().catch(()=>{});this.code='';this.renderPin();this.animations?.forEach(a=>a.cancel());window.removeEventListener('resize',this.resize);window.visualViewport?.removeEventListener('resize',this.resize);}
  disconnectedCallback(){this.cleanup();if(this.owner?.overlay===this&&this.owner?.trigger){this.owner.trigger.classList.remove('hidden');this.owner.trigger.setAttribute('aria-expanded','false');}if(this.owner?.overlay===this)this.owner.overlay=null;}
}
export class OrbitMenuCard extends Base {
  constructor(){super();this.attachShadow({mode:'open'});this.selected=null;this.pending=false;}
  static getConfigElement(){return document.createElement('orbit-menu-card-editor');}
  static getStubConfig(){return {type:'custom:orbit-menu-card',mode:'menu',items:[{name:'Главная',icon:'mdi:home-outline',tap_action:{action:'navigate',navigation_path:'/lovelace'}}]};}
  setConfig(raw){this.overlay?.close(true);this.config=normalizeConfig(raw);this.render();}
  set hass(h){this._hass=h;this.update();if(this.overlay?.awaitingDisarm&&h.states[this.config.entity]?.state==='disarmed'){this.overlay.awaitingDisarm=false;this.overlay.pinResult(true,'Охрана снята');}}
  connectedCallback(){if(this.config)this.render();}
  disconnectedCallback(){this.overlay?.close(true);}
  currentValue(){return this.config?.entity?this._hass?.states[this.config.entity]?.state:this.selected??this.config?.selected??null;}
  render(){if(!this.config)return;this.shadowRoot.replaceChildren(element('style','',cardCss));const card=element('div','card');card.style.setProperty('--size',`${this.config.button_size}px`);this.trigger=element('button','trigger');this.trigger.type='button';this.trigger.setAttribute('aria-haspopup','dialog');this.trigger.setAttribute('aria-expanded','false');this.trigger.addEventListener('click',()=>this.open());this.label=element('span','name');this.error=element('div','error');this.error.setAttribute('role','alert');card.append(this.trigger,this.label,this.error);this.shadowRoot.append(card);this.update();}
  update(){if(!this.trigger||!this.config)return;const item=this.config.mode==='select'?this.config.items.find(i=>i.value===this.currentValue()):null;const state=this.config.mode==='pin'?this._hass?.states[this.config.entity]?.state:null;this.trigger.replaceChildren(icon(this.config.mode==='pin'?pinStateIcon(state,this.config.pin.icons):item?.icon||this.config.icon));this.trigger.setAttribute('aria-label',item?`${this.config.name}: ${item.name}`:this.config.name);this.label.textContent=item?.name||this.config.name;this.trigger.classList.toggle('selected',!!item);this.trigger.disabled=this.pending;}
  open(){if(this.overlay||this.pending)return;this.error.textContent='';const portal=document.createElement('orbit-menu-overlay');this.overlay=portal;document.body.append(portal);try{portal.open(this);}catch(e){portal.cleanup();portal.remove();this.overlay=null;this.trigger.classList.remove('hidden');this.error.textContent=e.message;}}
  async submitPin(overlay){
    if(this.pending||overlay.closing)return;if(overlay.code.length!==this.config.pin.length){overlay.showError(`Введите ${this.config.pin.length} цифр`);return;}
    this.pending=true;overlay.busy(true);overlay.unlockSound();overlay.dialog.querySelector('.status')?.remove();
    const entity=this._hass?.states[this.config.entity];if(!entity||['unavailable','unknown'].includes(entity.state)){overlay.code='';await overlay.pinResult(false,'Сигнализация недоступна');return;}
    const code=overlay.code;overlay.code='';
    try{
      await this._hass.callService('alarm_control_panel','alarm_disarm',{entity_id:this.config.entity,code});if(!overlay.isConnected||overlay.closing)return;
      if(this._hass.states[this.config.entity]?.state==='disarmed'){await overlay.pinResult(true,'Охрана снята');}
      else{overlay.awaitingDisarm=true;overlay.showError('Проверяю код…');overlay.pinTimer=setTimeout(()=>{if(overlay.isConnected&&!overlay.closing)overlay.pinResult(false,'Снятие охраны не подтверждено. Проверьте код и состояние сигнализации.');},10000);}
    }catch{if(overlay.isConnected&&!overlay.closing)await overlay.pinResult(false,'Не удалось снять охрану. Проверьте код и состояние сигнализации.');}
  }
  async choose(item,overlay){if(this.pending)return;this.pending=true;overlay.dialog?.querySelector('.status')?.remove();overlay.busy(true);const closes=this.config.mode!=='menu-open';if(closes)await overlay.close();try{
    if(this.config.mode==='select'){
      if(this.config.entity){const entity=this._hass?.states[this.config.entity];if(!entity||['unknown','unavailable'].includes(entity.state))throw new Error('Селект сейчас недоступен');if(!entity.attributes?.options?.includes(item.value))throw new Error('Значение отсутствует в вариантах сущности');await this._hass.callService(this.config.entity.split('.')[0],'select_option',{entity_id:this.config.entity,option:item.value});}
      else this.selected=item.value;
      dispatch(this,'orbit-select',{value:item.value,item_id:item.id,entity:this.config.entity});
    }else await this.action(item);
    this.error.textContent='';
  }catch(e){const message=e.message||'Не удалось выполнить действие';this.error.textContent=message;if(!closes)overlay.showError(message);dispatch(this,'orbit-error',{message});}
    finally{this.pending=false;this.update();if(!closes&&overlay.isConnected)overlay.busy(false);}
  }
  async action(item){const action=item.tap_action||{action:item.entity?'more-info':'none'};const kind=action.action;const entity=action.entity||item.entity;
    if(action.confirmation){const text=typeof action.confirmation==='object'?action.confirmation.text:'Выполнить действие?';if(!window.confirm(text||'Выполнить действие?'))return;}
    if(kind==='none')return;
    if(kind==='navigate'){const path=safeUrl(action.navigation_path);history.pushState(null,'',path);window.dispatchEvent(new Event('location-changed'));return;}
    if(kind==='url'){const url=safeUrl(action.url_path,true);window.open(url,'_blank','noopener,noreferrer');return;}
    if(kind==='more-info'){if(!entity||!this._hass?.states[entity])throw new Error('Сущность не найдена');dispatch(this,'hass-more-info',{entityId:entity});return;}
    if(kind==='fire-dom-event'){const detail={...action};delete detail.action;dispatch(this,'ll-custom',detail);return;}
    if(!this._hass)throw new Error('Home Assistant не подключён');
    if(kind==='toggle'){if(!entity||!this._hass.states[entity]||['unknown','unavailable'].includes(this._hass.states[entity].state))throw new Error('Сущность недоступна');await this._hass.callService('homeassistant','toggle',{entity_id:entity});return;}
    if(['perform-action','call-service'].includes(kind)){const service=action.perform_action||action.service;if(!/^\w+\.\w+$/.test(service||''))throw new Error('Укажите domain.service');const [domain,name]=service.split('.');await this._hass.callService(domain,name,action.data||action.service_data||{},action.target);return;}
    throw new Error(`Действие не поддерживается: ${kind}`);
  }
  getCardSize(){return 1;}
}
class OrbitMenuEditor extends Base {
  constructor(){super();this.attachShadow({mode:'open'});}
  setConfig(config){this.config=structuredClone(config);this.render();}
  set hass(h){this._hass=h;}
  render(){if(!this.config)return;this.shadowRoot.replaceChildren(element('style','',`:host{display:block}label{display:flex;flex-direction:column;gap:8px;margin:16px 0;color:var(--primary-text-color);font:inherit}input,select,textarea{font:inherit;padding:10px;color:var(--primary-text-color);background:var(--card-background-color);border:1px solid var(--divider-color);border-radius:8px}textarea{min-height:220px;font-family:monospace}.hint{color:var(--secondary-text-color);font-size:14px}.error{color:var(--error-color,#ffbd44)}`));
    const controls=[['name','Название','text'],['icon','Иконка основной кнопки','text'],['mode','Поведение','select',['select','menu','menu-open','pin']],['layout','Раскладка','select',['auto','circle','fan','arc']],['entity','Сущность селекта / сигнализации','text'],['menu_position.preset','Положение меню','select',['trigger','center','top-left','top-right','bottom-left','bottom-right','custom']],['menu_position.x','Положение X (% экрана)','number'],['menu_position.y','Положение Y (% экрана)','number'],['pin.length','Длина PIN (4–8)','number'],['pin.icons.locked','Иконка: охрана включена','text'],['pin.icons.unlocked','Иконка: охрана снята','text'],['pin.icons.unavailable','Иконка: нет связи','text'],['radius','Радиус (px)','number'],['button_size','Размер основной кнопки (px)','number'],['item_size','Размер пунктов (px)','number'],['backdrop.opacity','Затемнение (0–1)','number'],['backdrop.blur','Размытие фона (px)','number'],['animation.open','Анимация раскрытия','select',['burst','clockwise','counterclockwise','spiral-clockwise','spiral-counterclockwise']],['animation.close','Анимация сворачивания','select',['reverse','burst','clockwise','counterclockwise','spiral-clockwise','spiral-counterclockwise']],['animation.duration','Анимация (ms)','number'],['animation.stagger','Задержка между пунктами (ms)','number']];
    const defaults=normalizeConfig(this.config);const names={burst:'Одновременно',clockwise:'По часовой стрелке',counterclockwise:'Против часовой стрелки','spiral-clockwise':'Спираль по часовой','spiral-counterclockwise':'Спираль против часовой',reverse:'Обратно раскрытию',pin:'PIN сигнализации',trigger:'У кнопки',center:'Центр',custom:'Координаты', 'top-left':'Сверху слева','top-right':'Сверху справа','bottom-left':'Снизу слева','bottom-right':'Снизу справа',select:'Селект',menu:'Меню с закрытием','menu-open':'Меню без закрытия',auto:'Авто',circle:'Круг',fan:'Веер',arc:'Дуга'};
    for(const [path,name,type,options] of controls){const label=element('label','',name);const input=element(type==='select'?'select':'input');if(type!=='select')input.type=type;if(options)for(const value of options){const o=element('option','',names[value]||value);o.value=value;input.append(o);}const get=(object)=>path.split('.').reduce((a,b)=>a?.[b],object);input.value=get(this.config)??get(defaults)??'';if(type==='number')input.step=path==='backdrop.opacity'?'.05':'1';input.addEventListener('change',()=>{const next=structuredClone(this.config);const keys=path.split('.');let target=next;for(const k of keys.slice(0,-1))target=target[k]??={};target[keys.at(-1)]=type==='number'?Number(input.value):input.value;if(path==='entity'&&!input.value)delete next.entity;this.emit(next);});label.append(input);this.shadowRoot.append(label);}
    for(const [key,title] of [['auto_submit','Автоотправка полного PIN'],['sound','Звук результата PIN']]){const label=element('label','',title),input=element('input');input.type='checkbox';input.checked=defaults.pin[key];input.addEventListener('change',()=>this.emit({...this.config,pin:{...this.config.pin,[key]:input.checked}}));label.append(input);this.shadowRoot.append(label);}
    const labels=element('label','','Показывать подписи');const check=element('input');check.type='checkbox';check.checked=this.config.show_labels!==false;check.addEventListener('change',()=>this.emit({...this.config,show_labels:check.checked}));labels.append(check);this.shadowRoot.append(labels);
    const label=element('label','','Пункты и действия (JSON)');const textarea=element('textarea');textarea.value=JSON.stringify(this.config.items,null,2);textarea.addEventListener('change',()=>{try{this.emit({...this.config,items:JSON.parse(textarea.value)});}catch(e){this.error.textContent=e.message;}});label.append(textarea);this.shadowRoot.append(label,element('div','hint','select — локальный выбор или input_select/select. menu — действие и закрытие. menu-open — действие без закрытия.'));
    this.error=element('div','error');this.error.setAttribute('role','alert');this.shadowRoot.append(this.error);
  }
  emit(config){try{normalizeConfig(config);this.config=config;this.error.textContent='';dispatch(this,'config-changed',{config});}catch(e){this.error.textContent=e.message;}}
}
if(globalThis.customElements){
  if(!customElements.get('orbit-menu-overlay'))customElements.define('orbit-menu-overlay',OrbitOverlay);
  if(!customElements.get('orbit-menu-card'))customElements.define('orbit-menu-card',OrbitMenuCard);
  if(!customElements.get('orbit-menu-card-editor'))customElements.define('orbit-menu-card-editor',OrbitMenuEditor);
  window.customCards=window.customCards||[];
  if(!window.customCards.some(c=>c.type==='orbit-menu-card'))window.customCards.push({type:'orbit-menu-card',name:'Orbit Menu',description:'Anchored radial select and action menu',preview:true});
}
