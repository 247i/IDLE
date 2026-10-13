const V="comment";let f={addComment:"Add Comment",addCommentPlaceholder:"Add a comment",commentOnSelectedElement:"Comment on selected element",elementComment:"Element comment {0}",elementCommentWithBody:"Element comment {0}: {1}",emptyElementComment:"Empty element comment {0}",removeComment:"Remove Comment",removeElementComment:"Remove element comment"};function Y(){const{contextBridge:B,ipcRenderer:e}=require("electron"),t={mac:{always:new Set(["arrowup","arrowdown","arrowleft","arrowright","backspace","delete"]),noShift:new Set(["a","c","v","x","z"]),withShift:new Set(["v","z"])},nonMac:{always:new Set(["arrowup","arrowdown","arrowleft","arrowright","home","end","backspace","delete"]),noShift:new Set(["a","c","v","x","z","y"]),withShift:new Set(["v","z"])}};window.addEventListener("keydown",i=>{if(!(i instanceof KeyboardEvent)||!i.isTrusted||i.defaultPrevented)return;const h=i.key==="Escape"||/^F\d+$/.test(i.key)||i.key.startsWith("Audio")||i.key.startsWith("Media")||i.key.startsWith("Browser");if(!(i.ctrlKey||i.altKey||i.metaKey)&&!h||i.key==="Control"||i.key==="Shift"||i.key==="Alt"||i.key==="Meta")return;const p=navigator.platform.indexOf("Mac")>=0;if(i.altKey&&!i.ctrlKey&&!i.metaKey&&(p||/^Numpad\d+$/.test(i.code))||i.key==="F10"&&i.shiftKey&&!i.ctrlKey&&!i.altKey&&!i.metaKey)return;if((p?i.metaKey:i.ctrlKey)&&!i.altKey){let w=i.key.toLowerCase();if(!/^[a-z]$/.test(w)&&/^Key[A-Z]$/.test(i.code)&&(w=i.code.slice(3).toLowerCase()),[t[p?"mac":"nonMac"].always,t[p?"mac":"nonMac"][i.shiftKey?"withShift":"noShift"]].some(E=>E.has(w))||p&&i.ctrlKey&&!i.shiftKey&&w===" ")return}i.preventDefault(),i.stopPropagation(),e.send("vscode:browserView:keydown",{key:i.key,keyCode:i.keyCode,code:i.code,ctrlKey:i.ctrlKey,shiftKey:i.shiftKey,altKey:i.altKey,metaKey:i.metaKey,repeat:i.repeat})});const n=new v((i,h)=>{const p=r(i);return e.send("vscode:browserView:elementPicked",{elementId:p,comment:h}),p},i=>e.send("vscode:browserView:elementCommentRemoved",i),()=>e.send("vscode:browserView:elementPickStopped")),o=new I(i=>e.send("vscode:browserView:areaPicked",i),()=>e.send("vscode:browserView:areaPickStopped")),a=new Map,c=new FinalizationRegistry(i=>{a.delete(i)});function r(i){const h=`el-${Date.now()}-${Math.random().toString(36).slice(2)}`;return a.set(h,new WeakRef(i)),c.register(i,h),h}let m;window.addEventListener("contextmenu",i=>{if(!i.isTrusted)return;const h=n.resolveContextMenuTarget(i);if(h){const p=[h],g=window.getSelection();g&&!g.isCollapsed&&p.push(g.anchorNode,g.focusNode),m={ref:new WeakRef(U(p)??h),anchor:{x:i.clientX,y:i.clientY}}}else m=void 0},{capture:!0}),e.on("vscode:browserView:setTheme",(i,h)=>{n.setTheme(h),o.setTheme(h)}),e.on("vscode:browserView:setLocalizedStrings",(i,h)=>{f=h,n.updateLocalizedStrings()}),e.on("vscode:browserView:startElementPicker",(i,h)=>{n.start(h)}),e.on("vscode:browserView:stopElementPicker",i=>{n.stop()}),e.on("vscode:browserView:startAreaPicker",i=>{o.start()}),e.on("vscode:browserView:stopAreaPicker",i=>{o.stop()}),e.on("vscode:browserView:highlightElement",(i,{elementId:h})=>{const p=l(h);p&&n.highlight(p)}),e.on("vscode:browserView:showElementComment",(i,{elementId:h})=>{const p=l(h);p&&m&&n.comment(p,m.anchor)}),e.on("vscode:browserView:hideHighlight",i=>{n.hideHighlight()}),e.on("vscode:browserView:setElementComments",(i,h)=>{n.updateComments(h)});const l=i=>{switch(i){case"active":return document.activeElement;case"context-menu-target":return m?.ref.deref()??null;default:return a.get(i)?.deref()??null}},d={getSelectedText(){try{return window.getSelection()?.toString()??""}catch{return""}}},u=`frame-${Date.now()}-${Math.random().toString(36).slice(2)}`,_={getElement:l,getFrameToken(){return u}};try{B.exposeInIsolatedWorld(999,"browserViewAPI",d),B.exposeInMainWorld("__vscode_helpers",_)}catch(i){console.error(i)}e.send("vscode:browserView:preloadReady",u)}function U(B){const e=B.filter(c=>!!c),t=[...new Set(e.map(c=>c instanceof Element?c:c.parentElement).filter(c=>!!c))];if(t.length===0)return;const n=c=>{for(let r=c;r;r=r.parentElement){const m=r instanceof HTMLElement?r.offsetWidth:r.clientWidth,l=r instanceof HTMLElement?r.offsetHeight:r.clientHeight;if(m>0&&l>0)return r}return c};if(t.length===1)return n(t[0]);const o=[];for(let c=t[0];c;c=c.parentElement)o.unshift(c);let a=o;for(let c=1;c<t.length;c++){const r=[];for(let d=t[c];d;d=d.parentElement)r.unshift(d);let m=0;const l=Math.min(a.length,r.length);for(;m<l&&a[m]===r[m];)m++;if(a=a.slice(0,m),a.length===0)return}return n(a[a.length-1])}class v{static{this._DRAG_THRESHOLD_PX=4}static{this._COMMENT_PIN_SIZE=22}static{this._COMMENT_PIN_RESTORE_FRAMES=5}static{this._COMMENT_PIN_RESTORE_TIMEOUT=100}static{this._COMMENT_PREVIEW_HIT_PADDING=v._COMMENT_PIN_SIZE/2}static{this._COMMENT_PREVIEW_HIDE_DELAY=80}static{this._COMMENT_SURFACE_ANIMATION_DURATION=140}static{this._COMMENT_SUPPORTING_FADE_DURATION=120}static{this._CURSOR_DEFAULT="/* VS Code injected style */ * { cursor: default !important; }"}static{this._CURSOR_CROSSHAIR="/* VS Code injected style */ * { cursor: crosshair !important; }"}constructor(e,t,n){this._onPicked=e,this._onCommentRemoved=t,this._onStopped=n,this._selectionActive=!1,this._continuous=!1,this._commentMode=!1,this._comments=new Map,this._pendingComments=new Map,this._scheduledCommentPins=new Map,this._dismissedCommentOnPointerDown=!1,this._commentPointerInteraction=!1,this._commentBackdropRequest=0,this._commentPreviewCollapsing=!1,this._reducedMotion=!1,this._onPointerMove=s=>{if(!this._selectionActive)return;const b=s.composedPath().includes(this._shadowHost);if(this._commentTarget){b||(this._commentPointerInteraction=!0);return}const L=this._pendingCommentInteractionId?this._pendingComments.get(this._pendingCommentInteractionId):void 0;if(L){b||(L.pointerInteraction=!0);return}if(this._commentPreviewElementId||this._externalHighlightTarget||b)return;if(s.preventDefault(),s.stopPropagation(),!this._dragStart){this._updateHighlight(this._pickElementAt(s.clientX,s.clientY));return}const M=Math.abs(s.clientX-this._dragStart.x),C=Math.abs(s.clientY-this._dragStart.y);if(M<v._DRAG_THRESHOLD_PX&&C<v._DRAG_THRESHOLD_PX)return;const z=Math.min(this._dragStart.x,s.clientX),R=Math.min(this._dragStart.y,s.clientY);this._dragbox.style.display="block",this._dragbox.style.left=`${z}px`,this._dragbox.style.top=`${R}px`,this._dragbox.style.width=`${M}px`,this._dragbox.style.height=`${C}px`,this._updateHighlight(this._pickRegionAncestor({x:z,y:R,width:M,height:C}))},this._onPointerLeave=()=>{if(!this._selectionActive)return;if(this._commentTarget){this._commentPointerInteraction=!0;return}const s=this._pendingCommentInteractionId?this._pendingComments.get(this._pendingCommentInteractionId):void 0;if(s){s.pointerInteraction=!0;return}this._commentPreviewElementId||this._externalHighlightTarget||this._dragStart||this._updateHighlight(this._focusedTarget)},this._onPointerDown=s=>{if(this._selectionActive&&(this._dismissedCommentOnPointerDown=!1,!s.composedPath().includes(this._shadowHost))){if(this._pendingCommentInteractionId){s.preventDefault(),s.stopPropagation();return}if(this._commentTarget){this._dismissedCommentOnPointerDown=!0,s.preventDefault(),s.stopPropagation();return}this._dragStart={x:s.clientX,y:s.clientY},this._dragStartTarget=this._pickElementAt(s.clientX,s.clientY),this._cursorStylesheet&&(this._cursorStylesheet.textContent=v._CURSOR_CROSSHAIR),s.preventDefault(),s.stopPropagation()}},this._onPointerUp=s=>{if(!this._selectionActive)return;if(this._dismissedCommentOnPointerDown){s.preventDefault(),s.stopPropagation();const C=this._commentTarget;C&&window.setTimeout(()=>{this._commentTarget===C&&this._finishCommentInteraction()});return}if(s.composedPath().includes(this._shadowHost)||!this._dragStart)return;const b=Math.abs(s.clientX-this._dragStart.x),L=Math.abs(s.clientY-this._dragStart.y),M=this._dragStart;if(this._dragStart=void 0,this._cursorStylesheet&&(this._cursorStylesheet.textContent=v._CURSOR_DEFAULT),b<v._DRAG_THRESHOLD_PX&&L<v._DRAG_THRESHOLD_PX){const C=this._dragStartTarget??this._pickElementAt(s.clientX,s.clientY);this._dragStartTarget=void 0,C&&this._commit(C,{x:s.clientX,y:s.clientY})}else{this._dragStartTarget=void 0,this._dragbox.style.display="none",this._updateHighlight(void 0);const C=Math.min(M.x,s.clientX),z=Math.min(M.y,s.clientY),R=this._pickRegionAncestor({x:C,y:z,width:b,height:L});R&&this._commit(R,{x:s.clientX,y:s.clientY})}s.preventDefault(),s.stopPropagation()},this._onClick=s=>{if(this._selectionActive){if(this._dismissedCommentOnPointerDown){this._dismissedCommentOnPointerDown=!1,s.preventDefault(),s.stopPropagation(),this._finishCommentInteraction();return}s.composedPath().includes(this._shadowHost)||(s.preventDefault(),s.stopPropagation())}},this._onFocusIn=s=>{if(!this._selectionActive||this._commentTarget||this._pendingCommentInteractionId||this._externalHighlightTarget||s.composedPath().includes(this._shadowHost))return;const b=this._getFocusedElement();this._focusedTarget=b?.matches(":focus-visible")?b:void 0,this._updateHighlight(this._focusedTarget)},this._onWindowBlur=()=>{!this._selectionActive||this._commentTarget||this._externalHighlightTarget||(this._focusedTarget=void 0,this._updateHighlight(void 0))},this._onKeyDown=s=>{if(this._selectionActive){if(s.key==="Escape"){if(this._commentTarget){const b=this._commentTarget;this._focusCommentTarget(b),this._finishCommentInteraction(),s.preventDefault(),s.stopPropagation();return}this.stop(),s.preventDefault(),s.stopPropagation()}else if(s.key==="Enter"&&!s.isComposing){if(this._pendingCommentInteractionId){s.preventDefault(),s.stopPropagation();return}const b=this._getFocusedElement();b&&(s.preventDefault(),s.stopPropagation(),this._commit(b))}}};const o=document.createElement("div");o.setAttribute("data-vscode-pick-host",""),o.style.cssText="position: absolute; top: 0; left: 0; width: 0; height: 0; z-index: 2147483647; pointer-events: none;";const a=o.attachShadow({mode:"closed"});a.appendChild(v._buildStyle()),this._shadowHost=o;const c="http://www.w3.org/2000/svg",r=document.createElementNS(c,"svg");r.classList.add("comment-backdrop");const m=`vscode-comment-cutout-${Math.random().toString(36).slice(2)}`,l=document.createElementNS(c,"defs"),d=document.createElementNS(c,"mask");d.id=m,d.setAttribute("maskUnits","userSpaceOnUse"),d.setAttribute("x","0"),d.setAttribute("y","0"),d.setAttribute("width","100%"),d.setAttribute("height","100%");const u=document.createElementNS(c,"rect");u.setAttribute("width","100%"),u.setAttribute("height","100%"),u.setAttribute("fill","white");const _=document.createElementNS(c,"rect");_.setAttribute("fill","black"),d.append(u,_),l.appendChild(d);const i=document.createElementNS(c,"rect");i.classList.add("comment-backdrop-fill"),i.setAttribute("width","100%"),i.setAttribute("height","100%"),i.setAttribute("mask",`url(#${m})`);const h=document.createElementNS(c,"rect");h.classList.add("highlight-shape"),h.style.display="none",r.append(l,i,h),a.appendChild(r),this._commentBackdrop=r,this._commentBackdropCutout=_,this._highlightShape=h;const p=document.createElement("div");p.className="highlight",p.style.display="none",a.appendChild(p),this._highlight=p;const g=document.createElement("button");g.className="comment-preview-remove",g.type="button";const w=document.createElementNS(c,"svg");w.setAttribute("viewBox","0 0 16 16"),w.setAttribute("fill","currentColor"),w.setAttribute("aria-hidden","true");const S=document.createElementNS(c,"path");S.setAttribute("d","M3.854 3.146a.5.5 0 0 0-.708.708L7.293 8l-4.147 4.146a.5.5 0 0 0 .708.708L8 8.707l4.146 4.147a.5.5 0 0 0 .708-.708L8.707 8l4.147-4.146a.5.5 0 0 0-.708-.708L8 7.293 3.854 3.146Z"),w.appendChild(S),g.appendChild(w),g.title=f.removeComment,g.setAttribute("aria-label",f.removeElementComment),g.addEventListener("click",()=>{this._commentPreviewElementId&&this._removeComment(this._commentPreviewElementId)}),this._commentPreviewRemoveButton=g;const E=document.createElement("div");E.className="overlay",a.appendChild(E),this._overlay=E;const T=document.createElement("div");T.className="label",T.style.display="none",a.appendChild(T),this._label=T;const N=document.createElement("span");N.className="label-info",T.appendChild(N);const $=document.createElement("span");$.className="label-selector",N.appendChild($),this._labelSelector=$;const F=document.createElement("span");F.className="label-classes",N.appendChild(F),this._labelClasses=F;const W=document.createElement("span");W.className="label-dims",T.appendChild(W),this._labelDims=W;const A=document.createElement("div");A.className="comment-preview-hit-area",A.style.display="none",a.appendChild(A),this._commentPreviewHitArea=A;const k=document.createElement("div");k.className="comment-surface comment-preview",k.style.display="none",k.setAttribute("role","note");const K=document.createElement("span");K.className="comment-preview-body",k.appendChild(K),k.appendChild(g),A.appendChild(k),this._commentPreview=k,this._commentPreviewBody=K,A.addEventListener("mouseenter",()=>this._cancelCommentPreviewHide()),A.addEventListener("mouseleave",()=>this._scheduleCommentPreviewHide()),A.addEventListener("focusin",()=>this._cancelCommentPreviewHide()),A.addEventListener("focusout",()=>this._scheduleCommentPreviewHide());const D=document.createElement("div");D.className="dragbox",D.style.display="none",a.appendChild(D),this._dragbox=D;const O=document.createElement("div");O.className="comment-layer",a.appendChild(O),this._commentLayer=O;const x=document.createElement("div");x.className="comment-surface comment-composer",x.style.display="none",x.setAttribute("role","dialog"),x.setAttribute("aria-label",f.commentOnSelectedElement),x.setAttribute("aria-modal","true"),O.appendChild(x),this._commentComposer=x;const y=document.createElement("textarea");y.className="comment-input",y.rows=1,y.placeholder=f.addCommentPlaceholder,y.setAttribute("aria-label",f.commentOnSelectedElement),y.addEventListener("input",()=>this._layoutCommentInput()),y.addEventListener("keydown",s=>{s.stopPropagation(),s.key==="Enter"&&!s.isComposing&&(s.preventDefault(),this._submitComment())}),y.addEventListener("keypress",s=>s.stopPropagation()),y.addEventListener("keyup",s=>s.stopPropagation()),x.appendChild(y),this._commentInput=y;const P=document.createElement("button");P.className="comment-send",P.type="button";const H=document.createElementNS(c,"svg");H.setAttribute("viewBox","0 0 16 16"),H.setAttribute("fill","currentColor"),H.setAttribute("aria-hidden","true");const X=document.createElementNS(c,"path");X.setAttribute("d","M8.5 3a.5.5 0 0 0-1 0v4.5H3a.5.5 0 0 0 0 1h4.5V13a.5.5 0 0 0 1 0V8.5H13a.5.5 0 0 0 0-1H8.5V3Z"),H.appendChild(X),P.appendChild(H),P.title=f.addComment,P.setAttribute("aria-label",f.addComment),P.addEventListener("click",()=>this._submitComment()),x.appendChild(P),this._commentSendButton=P,x.addEventListener("keydown",s=>{s.key==="Tab"&&(s.shiftKey&&s.target===y?(s.preventDefault(),P.focus()):!s.shiftKey&&s.target===P&&(s.preventDefault(),y.focus()))}),window.addEventListener("scroll",()=>this._onScrollOrResize(),{passive:!0,capture:!0}),window.addEventListener("resize",()=>this._onScrollOrResize())}start(e){if(this._selectionActive)return this._updateSelectionOptions(e),!0;this._commentMode=e.mode===V,this._continuous=e.continuous??!1,this._ensureMounted(),this._selectionActive=!0,this._overlay.style.display="block";const t=document.createElement("style");if(t.textContent=v._CURSOR_DEFAULT,document.head.appendChild(t),this._cursorStylesheet=t,window.addEventListener("pointermove",this._onPointerMove,!0),document.addEventListener("pointerleave",this._onPointerLeave,!0),window.addEventListener("pointerdown",this._onPointerDown,!0),window.addEventListener("pointerup",this._onPointerUp,!0),window.addEventListener("click",this._onClick,!0),window.addEventListener("contextmenu",this._onClick,!0),window.addEventListener("focusin",this._onFocusIn,!0),window.addEventListener("blur",this._onWindowBlur),window.addEventListener("keydown",this._onKeyDown,!0),!this._externalHighlightTarget){const n=this._getFocusedElement();this._focusedTarget=e.highlightFocusedElement?n:void 0,this._updateHighlight(this._focusedTarget)}return!0}_updateSelectionOptions(e){const t=this._commentMode;this._commentMode=e.mode===V,this._continuous=e.continuous??!1,t&&!this._commentMode&&this._commentTarget&&this._closeCommentComposer(),e.highlightFocusedElement&&!this._commentTarget&&!this._commentPreviewElementId&&!this._externalHighlightTarget&&(this._focusedTarget=this._getFocusedElement(),this._updateHighlight(this._focusedTarget))}stop(){this._selectionActive&&(this._hideActiveCommentPreview(),this._selectionActive=!1,this._closeCommentComposer(),this._overlay.style.display="none",this._cursorStylesheet?.remove(),this._cursorStylesheet=void 0,window.removeEventListener("pointermove",this._onPointerMove,!0),document.removeEventListener("pointerleave",this._onPointerLeave,!0),window.removeEventListener("pointerdown",this._onPointerDown,!0),window.removeEventListener("pointerup",this._onPointerUp,!0),window.removeEventListener("click",this._onClick,!0),window.removeEventListener("contextmenu",this._onClick,!0),window.removeEventListener("focusin",this._onFocusIn,!0),window.removeEventListener("blur",this._onWindowBlur),window.removeEventListener("keydown",this._onKeyDown,!0),this._highlight.style.display="none",this._label.style.display="none",this._dragbox.style.display="none",this._dragStart=void 0,this._dragStartTarget=void 0,this._dismissedCommentOnPointerDown=!1,this._highlightTarget=void 0,this._focusedTarget=void 0,this._externalHighlightTarget&&this._updateHighlight(this._externalHighlightTarget),this._onStopped(),this._unmountWhenIdle())}setTheme(e){v._applyTheme(this._shadowHost,e),this._reducedMotion=e.reducedMotion??!1,this._shadowHost.classList.toggle("reduce-motion",this._reducedMotion)}updateLocalizedStrings(){this._applyLocalizedStrings()}resolveContextMenuTarget(e){return this._commentPreviewElementId&&e.composedPath().includes(this._shadowHost)?(this._hideActiveCommentPreview(),this._pickElementAt(e.clientX,e.clientY)):e.target instanceof Element?e.target:void 0}highlight(e){this._ensureMounted(),this._externalHighlightTarget=e,this._hideActiveCommentPreview(),this._updateHighlight(e)}hideHighlight(){this._externalHighlightTarget=void 0,!this._commentTarget&&(this._updateHighlight(void 0),this._unmountWhenIdle())}comment(e,t){this._externalHighlightTarget=void 0,this._selectionActive&&this.stop(),this.start({mode:V}),this._showCommentComposer(e,t,!0)}updateComments(e){if(e.comments){const t=new Map(e.comments.map((n,o)=>[n.elementId,{body:n.body,ordinal:o+1}]));for(const[n,o]of this._comments){const a=t.get(n);if(!a)this._commentPreviewElementId===n&&this._hideActiveCommentPreview(),o.pin.remove(),this._comments.delete(n);else{if(o.ordinal=a.ordinal,a.body===o.body)continue;o.body=a.body,this._commentPreviewElementId===n&&(this._setCommentPreviewBody(a.body),this._renderHighlight(o.target))}}for(const[n,o]of t){if(this._comments.has(n))continue;this._pendingComments.get(n)&&this._scheduleCommentPin(n,o.body,o.ordinal)}for(const n of this._scheduledCommentPins.keys())t.has(n)||this._discardPendingComment(n)}for(const t of e.pendingCommentIdsToDiscard??[])this._discardPendingComment(t);this._updateCommentPinNumbers(),this._unmountWhenIdle()}_onScrollOrResize(){this._commentPreviewCollapsing&&this._hideActiveCommentPreview(),this._cancelCommentAnimations(),this._highlightTarget&&this._renderHighlight(this._highlightTarget),this._commentBackdropTarget&&this._layoutCommentBackdrop(this._commentBackdropTarget);for(const e of this._comments.values())this._layoutCommentPin(e)}_getFocusedElement(){if(!document.hasFocus())return;let e=document.activeElement;for(;e?.shadowRoot?.activeElement;)e=e.shadowRoot.activeElement;if(!(!e||e===document.body||e===document.documentElement||e===this._shadowHost||e instanceof HTMLIFrameElement))return e}_pickElementAt(e,t){const n=document.elementsFromPoint(e,t);for(const o of n)if(!(o===this._shadowHost||this._shadowHost.contains(o)))return o}_pickRegionAncestor(e){const{x:t,y:n,width:o,height:a}=e,c=t+o,r=n+a,m=t+o/2,l=n+a/2,d=[];for(const[u,_]of[[t,n],[c,n],[t,r],[c,r],[m,n],[m,r],[t,l],[c,l],[m,l]]){const i=this._pickElementAt(u,_);i&&d.push(i)}return U(d)}_renderHighlight(e){const t=this._highlight,n=this._label,o=e.getBoundingClientRect(),a=window.scrollX||0,c=window.scrollY||0,r=window.innerHeight,m=document.documentElement.clientWidth,l=this._getVisibleTargetBounds(o),d=22;t.style.display="block",t.style.left=`${o.left+a}px`,t.style.top=`${o.top+c}px`,t.style.width=`${o.width}px`,t.style.height=`${o.height}px`,this._highlightShape.style.display="block",this._highlightShape.setAttribute("x",`${l.x}`),this._highlightShape.setAttribute("y",`${l.y}`),this._highlightShape.setAttribute("width",`${l.width}`),this._highlightShape.setAttribute("height",`${l.height}`),this._highlightShape.setAttribute("rx","2");const u=String(e.tagName||"").toLowerCase(),_=e.id?`#${e.id}`:"",i=e.classList.length?"."+[...e.classList].join("."):"";this._labelSelector.textContent=u+_,this._labelClasses.textContent=i,this._labelDims.textContent=`${Math.round(o.width)} \xD7 ${Math.round(o.height)}`,n.style.display="inline-flex";const h=o.top-d,p=Math.max(0,Math.min(r-d,h));n.style.left="0";const g=n.offsetWidth,w=o.left,S=Math.max(0,Math.min(w,m-g));if(n.style.left=`${S}px`,n.style.top=`${p}px`,this._commentPreview.style.display!=="none"){const E=this._layoutCommentSurface(this._commentPreview,l,m,r);this._commentPreviewElementId&&E==="above"&&this._elementsOverlap(n,this._commentPreview)&&(n.style.top=`${Math.max(0,Math.min(r-d,l.bottom+2))}px`)}this._commentComposer.style.display!=="none"&&this._layoutCommentSurface(this._commentComposer,l,m,r)}_elementsOverlap(e,t){const n=e.getBoundingClientRect(),o=t.getBoundingClientRect();return n.left<o.right&&n.right>o.left&&n.top<o.bottom&&n.bottom>o.top}_getVisibleTargetBounds(e){const t=Math.max(0,Math.min(e.left,window.innerWidth)),n=Math.max(t,Math.min(e.right,window.innerWidth)),o=Math.max(0,Math.min(e.top,window.innerHeight)),a=Math.max(o,Math.min(e.bottom,window.innerHeight));return new DOMRect(t,o,n-t,a-o)}_layoutCommentSurface(e,t,n,o){if(e===this._commentPreview){e.style.width="max-content",e.style.minWidth="0",e.style.maxWidth=`${Math.min(320,n-16)}px`;const i=this._commentPreviewElementId?this._comments.get(this._commentPreviewElementId):void 0;if(i){const h=i.pin.getBoundingClientRect();return this._layoutCommentSurfaceAtAnchor(e,{x:h.left+h.width/2,y:h.top+h.height/2},n,o)}}else if(e===this._commentComposer&&this._commentAnchor)return e.style.maxWidth=`${Math.min(320,n-16)}px`,this._layoutCommentSurfaceAtAnchor(e,{x:this._commentAnchor.x-window.scrollX,y:this._commentAnchor.y-window.scrollY},n,o);const a=e.offsetHeight,c=t.bottom,r=c+a<=o-8?"below":"above",m=c+a<=o-8?c:Math.max(0,t.top-a),l=e.offsetWidth,d=t.left+l<=n,u=d?"left":"right",_=d?Math.max(0,t.left):Math.max(0,t.right-l);return e.dataset.attachmentCorner=`${r==="below"?"top":"bottom"}-${u}`,this._setCommentSurfacePosition(e,_,m),r}_layoutCommentSurfaceAtAnchor(e,t,n,o){let c=e.offsetWidth;const r=Math.max(0,n-8-t.x),m=Math.max(0,t.x-8),l=c<=r||c>m&&r>=m,d=l?r:m;c>d&&(e.style.maxWidth=`${d}px`,c=e.offsetWidth);const u=e.offsetHeight,_=Math.max(0,o-8-t.y),i=Math.max(0,t.y-8),p=!(u<=i||u>_&&i>=_),g=p?"below":"above",w=l?"left":"right";e.dataset.attachmentCorner=`${p?"top":"bottom"}-${w}`;const S=l?t.x:t.x-c,E=p?t.y:Math.max(8,t.y-u);return this._setCommentSurfacePosition(e,S,E),g}_setCommentSurfacePosition(e,t,n){if(e!==this._commentPreview){e.style.left=`${t}px`,e.style.top=`${n}px`;return}const o=v._COMMENT_PREVIEW_HIT_PADDING;this._commentPreviewHitArea.style.left=`${t-o}px`,this._commentPreviewHitArea.style.top=`${n-o}px`,this._commentPreviewHitArea.style.width=`${e.offsetWidth+o*2}px`,this._commentPreviewHitArea.style.height=`${e.offsetHeight+o*2}px`,e.style.left=`${o}px`,e.style.top=`${o}px`}_updateHighlight(e){if(this._highlightTarget=e,!e){this._highlight.style.display="none",this._highlightShape.style.display="none",this._label.style.display="none";return}this._renderHighlight(e)}_commit(e,t){if(this._selectionActive){if(this._commentMode){this._showCommentComposer(e,t??this._getDefaultCommentAnchor(e),t!==void 0);return}requestAnimationFrame(()=>{this._continuous?this._updateHighlight(void 0):this.stop(),this._onPicked(e)})}}_getDefaultCommentAnchor(e){const t=e.getBoundingClientRect();return{x:t.left,y:t.bottom}}_showCommentComposer(e,t,n=!1){this._externalHighlightTarget=void 0,this._hideActiveCommentPreview(),this._commentTarget=e,this._commentPointerInteraction=n,this._commentAnchor={x:t.x+window.scrollX,y:t.y+window.scrollY},this._showCommentBackdrop(e),this._commentLayer.classList.add("composing"),this._commentInput.value="",this._commentComposer.style.display="flex",this._resizeCommentInput(),this._updateHighlight(e),this._animateCommentComposer(),this._commentInput.focus({preventScroll:!0}),requestAnimationFrame(()=>{this._commentTarget===e&&this._commentInput.focus({preventScroll:!0})})}_animateCommentComposer(){this._reducedMotion||(this._cancelCommentAnimations(),this._commentAnimation={surface:this._animateCommentSurface(this._commentComposer),supporting:[]})}_setCommentSurfaceTransformOrigin(e){const[t,n]=(e.dataset.attachmentCorner??"top-left").split("-");e.style.transformOrigin=`${n} ${t}`}_closeCommentComposer(){this._commentTarget=void 0,this._commentAnchor=void 0,this._hideCommentBackdrop(),this._commentLayer.classList.remove("composing"),this._commentComposer.style.display="none",this._commentInput.value="",this._cancelCommentAnimations(),this._updateHighlight(void 0)}_finishCommentInteraction(){this._continuous?this._closeCommentComposer():this.stop()}_submitComment(){const e=this._commentTarget,t=this._commentAnchor;if(!e||!t)return;const n=this._commentInput.value.replace(/\r?\n/g," "),o={target:e,anchor:t,body:n,pointerInteraction:this._commentPointerInteraction};this._commentLayer.classList.add("comment-capture-pending"),this._finishCommentInteraction();const a=this._onPicked(e,n);this._pendingComments.set(a,o),this._pendingCommentInteractionId=a}_restoreInteractionAfterComment(e,t){this._pendingCommentInteractionId===e&&(this._pendingCommentInteractionId=void 0,this._commentLayer.classList.remove("comment-capture-pending")),!this._commentTarget&&(t.pointerInteraction||this._focusCommentTarget(t.target))}_focusCommentTarget(e){if(!e.isConnected||!(e instanceof HTMLElement||e instanceof SVGElement))return;const t=e.hasAttribute("tabindex");t||(e.tabIndex=-1),e.focus({preventScroll:!0}),t||e.removeAttribute("tabindex")}_discardPendingComment(e){const t=this._pendingComments.get(e);this._pendingComments.delete(e),this._cancelScheduledCommentPin(e),t&&this._restoreInteractionAfterComment(e,t)}_cancelScheduledCommentPin(e){const t=this._scheduledCommentPins.get(e);t&&(window.clearTimeout(t.timeout),cancelAnimationFrame(t.animationFrame),this._scheduledCommentPins.delete(e))}_scheduleCommentPin(e,t,n){const o=this._scheduledCommentPins.get(e);if(o){o.body=t,o.ordinal=n;return}const a={body:t,ordinal:n,animationFrame:0,timeout:0};this._scheduledCommentPins.set(e,a);let c=0;const r=()=>{if(this._scheduledCommentPins.get(e)!==a)return;this._cancelScheduledCommentPin(e);const l=this._pendingComments.get(e);l&&this._createCommentPin(e,l.target,l.anchor,a.body,a.ordinal)},m=()=>{this._scheduledCommentPins.get(e)===a&&(c++,c>=v._COMMENT_PIN_RESTORE_FRAMES?r():a.animationFrame=requestAnimationFrame(m))};a.timeout=window.setTimeout(r,v._COMMENT_PIN_RESTORE_TIMEOUT),a.animationFrame=requestAnimationFrame(m)}_createCommentPin(e,t,n,o,a){this._ensureMounted();const c=this._comments.get(e);c&&this._commentPreviewElementId===e&&this._hideActiveCommentPreview(),c?.pin.remove();const r=this._pendingComments.get(e);this._pendingComments.delete(e);const m=t.getBoundingClientRect(),l={x:n.x-(m.left+window.scrollX),y:n.y-(m.top+window.scrollY)},d=document.createElement("div");d.className="comment-pin",d.tabIndex=0,d.setAttribute("role","note");const u=document.createElement("span");u.className="comment-pin-bubble";const _=document.createElement("span");_.className="comment-pin-number",u.appendChild(_),d.appendChild(u);const i=()=>{this._commentTarget||this._pendingCommentInteractionId||this._externalHighlightTarget||this._showCommentPreview(e,t,o)};d.addEventListener("pointermove",i),d.addEventListener("focusin",i),d.addEventListener("focusout",()=>this._scheduleCommentPreviewHide()),this._commentLayer.appendChild(d);const h={target:t,pin:d,numberElement:_,body:o,ordinal:a,offset:l};this._comments.set(e,h),this._updateCommentPinNumbers(),this._layoutCommentPin(h),r&&this._restoreInteractionAfterComment(e,r)}_updateCommentPinNumbers(){for(const e of this._comments.values()){const t=String(e.ordinal);e.numberElement.textContent=t,e.pin.title=e.body||this._formatLocalizedString(f.elementComment,t),e.pin.setAttribute("aria-label",e.body?this._formatLocalizedString(f.elementCommentWithBody,t,e.body):this._formatLocalizedString(f.emptyElementComment,t))}}_applyLocalizedStrings(){this._commentPreviewRemoveButton.title=f.removeComment,this._commentPreviewRemoveButton.setAttribute("aria-label",f.removeElementComment),this._commentComposer.setAttribute("aria-label",f.commentOnSelectedElement),this._commentInput.placeholder=f.addCommentPlaceholder,this._commentInput.setAttribute("aria-label",f.commentOnSelectedElement),this._commentSendButton.title=f.addComment,this._commentSendButton.setAttribute("aria-label",f.addComment),this._updateCommentPinNumbers()}_formatLocalizedString(e,...t){return e.replace(/\{(\d+)\}/g,(n,o)=>t[Number(o)]??"")}_layoutCommentPin(e){const t=e.target.getBoundingClientRect(),n=t.left+window.scrollX+e.offset.x,o=t.top+window.scrollY+e.offset.y,a=document.scrollingElement??document.documentElement,c=e.pin.offsetWidth/2,r=e.pin.offsetHeight/2,m=Math.max(c,Math.min(n,a.scrollWidth-c)),l=Math.max(r,Math.min(o,a.scrollHeight-r));e.pin.style.left=`${m}px`,e.pin.style.top=`${l}px`}_showCommentPreview(e,t,n){if(this._pendingCommentInteractionId||this._commentPreviewCollapsing)return;if(this._commentPreviewElementId===e){this._cancelCommentPreviewHide();return}this._hideActiveCommentPreview(),this._commentPreviewElementId=e;const o=this._comments.get(e);o&&(o.pin.classList.add("previewing"),o.pin.after(this._commentPreviewHitArea));const a=o?.body??n;this._setCommentPreviewBody(a),this._shadowHost.classList.add("comment-preview-active"),this._updateHighlight(t),this._showCommentBackdrop(t),o&&this._animateCommentPreview()}_setCommentPreviewBody(e){this._commentPreviewBody.textContent=e,this._commentPreview.title=e,this._commentPreview.classList.toggle("empty",!e),this._commentPreviewHitArea.style.display="block",this._commentPreview.style.display="flex"}_animateCommentPreview(e=!1){if(this._reducedMotion)return;const t=this._animateCommentSurface(this._commentPreview,e),n=e?[{opacity:1},{opacity:0}]:[{opacity:0},{opacity:1}],o=[];for(const a of[this._highlightShape,this._label]){if(a.style.display==="none")continue;const c=a.animate(n,{duration:v._COMMENT_SUPPORTING_FADE_DURATION,easing:"linear",fill:"both"});o.push(c)}return this._commentAnimation={surface:t,supporting:o},t}_animateCommentSurface(e,t=!1){return this._setCommentSurfaceTransformOrigin(e),e.animate(t?[{transform:"scale(1)"},{transform:"scale(0)"}]:[{transform:"scale(0)"},{transform:"scale(1)"}],{duration:v._COMMENT_SURFACE_ANIMATION_DURATION,easing:"cubic-bezier(0.2, 0, 0, 1)",fill:"forwards"})}_scheduleCommentPreviewHide(){this._commentPreviewCollapsing||(this._cancelCommentPreviewHide(),this._commentPreviewHideTimeout=window.setTimeout(()=>{this._commentPreviewHideTimeout=void 0;const t=(this._commentPreviewElementId?this._comments.get(this._commentPreviewElementId):void 0)?.pin.matches(":focus-within")??!1,n=this._commentPreviewHitArea.matches(":hover, :focus-within");t||n||this._collapseActiveCommentPreview()},v._COMMENT_PREVIEW_HIDE_DELAY))}_cancelCommentPreviewHide(){this._commentPreviewHideTimeout!==void 0&&(window.clearTimeout(this._commentPreviewHideTimeout),this._commentPreviewHideTimeout=void 0)}_collapseActiveCommentPreview(){if(this._commentPreviewCollapsing)return;const e=this._commentPreviewElementId,t=e?this._comments.get(e):void 0;if(!e||!t||this._reducedMotion){this._hideActiveCommentPreview();return}this._commentPreviewCollapsing=!0,this._shadowHost.classList.add("comment-preview-collapsing"),this._hideCommentBackdrop();const n=this._commentAnimation;let o;if(n){o=n.surface,o.reverse();for(const a of n.supporting)a.reverse()}else o=this._animateCommentPreview(!0);if(!o){this._hideActiveCommentPreview();return}o.onfinish=()=>{this._commentPreviewCollapsing&&this._commentPreviewElementId===e&&(this._commentPreviewCollapsing=!1,this._hideActiveCommentPreview())}}_cancelCommentAnimations(){if(this._commentAnimation){this._commentAnimation.surface.cancel();for(const e of this._commentAnimation.supporting)e.cancel();this._commentAnimation=void 0}}_hideActiveCommentPreview(){this._cancelCommentPreviewHide(),this._commentPreviewCollapsing=!1,this._shadowHost.classList.remove("comment-preview-collapsing"),this._commentPreviewElementId&&this._comments.get(this._commentPreviewElementId)?.pin.classList.remove("previewing"),this._commentPreviewElementId=void 0,this._shadowHost.classList.remove("comment-preview-active"),this._commentPreviewHitArea.style.display="none",this._commentPreview.style.display="none",this._hideCommentBackdrop(),this._commentTarget||this._updateHighlight(this._externalHighlightTarget),this._cancelCommentAnimations()}_removeComment(e){const t=this._comments.get(e);t&&(this._hideActiveCommentPreview(),t.pin.remove(),this._comments.delete(e),this._updateCommentPinNumbers(),this._unmountWhenIdle(),this._onCommentRemoved(e))}_layoutCommentInput(){this._resizeCommentInput(),this._layoutCommentComposer()}_resizeCommentInput(){this._commentInput.style.height="auto",this._commentInput.style.height=`${Math.min(this._commentInput.scrollHeight,96)}px`}_layoutCommentBackdrop(e){const t=this._getVisibleTargetBounds(e.getBoundingClientRect());this._commentBackdropCutout.setAttribute("x",`${t.x}`),this._commentBackdropCutout.setAttribute("y",`${t.y}`),this._commentBackdropCutout.setAttribute("width",`${t.width}`),this._commentBackdropCutout.setAttribute("height",`${t.height}`),this._commentBackdropCutout.setAttribute("rx","2")}_showCommentBackdrop(e){const t=++this._commentBackdropRequest;this._commentBackdropTarget=e,this._layoutCommentBackdrop(e),this._commentBackdrop.classList.remove("visible"),requestAnimationFrame(()=>{this._commentBackdropRequest===t&&this._commentBackdrop.classList.add("visible")})}_hideCommentBackdrop(){this._commentBackdropRequest++,this._commentBackdropTarget=void 0,this._commentBackdrop.classList.remove("visible")}_layoutCommentComposer(){this._commentTarget&&this._renderHighlight(this._commentTarget)}_ensureMounted(){this._shadowHost.parentNode||document.documentElement.appendChild(this._shadowHost)}_unmountWhenIdle(){!this._selectionActive&&!this._highlightTarget&&this._comments.size===0&&this._shadowHost.remove()}static _buildStyle(){const e=document.createElement("style");return e.textContent=`
			:host {
				all: initial;
				font-family: var(--pick-font, system-ui, -apple-system, sans-serif);
				pointer-events: none !important;
			}
			.highlight {
				position: absolute; box-sizing: border-box;
				z-index: 2;
			}
			.comment-backdrop {
				position: fixed;
				inset: 0;
				width: 100%;
				height: 100%;
				pointer-events: none;
				z-index: 2;
			}
			.comment-backdrop-fill {
				fill: var(--vscode-widget-shadow, transparent);
				opacity: 0;
				transition: opacity 120ms linear;
			}
			.comment-backdrop.visible .comment-backdrop-fill {
				opacity: 1;
			}
			.highlight-shape {
				fill: color-mix(in srgb, var(--vscode-focusBorder, #0078d4) 12%, transparent);
				stroke: var(--vscode-focusBorder, #0078d4);
				stroke-width: 2px;
			}
			.overlay {
				position: fixed; inset: 0;
				background: transparent; box-sizing: border-box;
				z-index: 2;
			}
			.comment-layer {
				position: absolute; inset: 0; pointer-events: none;
			}
			.comment-surface {
				position: fixed;
				box-sizing: border-box;
				width: min(320px, calc(100vw - 16px));
				border: var(--vscode-strokeThickness, 1px) solid var(--vscode-editorWidget-border, var(--vscode-contrastBorder, #454545));
				border-radius: var(--vscode-cornerRadius-large, 8px);
				background: var(--vscode-editorWidget-background, #252526);
				color: var(--vscode-editorWidget-foreground, #cccccc);
				box-shadow: 0 2px 6px var(--vscode-widget-shadow, transparent);
				font-size: 13px;
				font-weight: 400;
				z-index: 4;
			}
			.comment-surface[data-attachment-corner='top-left'] {
				border-top-left-radius: 0;
			}
			.comment-surface[data-attachment-corner='top-right'] {
				border-top-right-radius: 0;
			}
			.comment-surface[data-attachment-corner='bottom-left'] {
				border-bottom-left-radius: 0;
			}
			.comment-surface[data-attachment-corner='bottom-right'] {
				border-bottom-right-radius: 0;
			}
			.comment-preview-hit-area {
				position: fixed;
				pointer-events: none;
				z-index: 4;
			}
			.comment-preview {
				position: absolute;
				align-items: flex-start;
				gap: 8px;
				max-height: 96px;
				padding: 6px 8px;
				overflow: hidden;
				line-height: 20px;
				pointer-events: none;
			}
			.comment-preview.empty {
				gap: 0;
				padding: 4px;
			}
			.comment-preview.empty .comment-preview-body {
				display: none;
			}
			.comment-preview.empty .comment-preview-remove {
				margin-block: 0;
			}
			.comment-preview-body {
				flex: 1;
				min-width: 0;
				max-height: 82px;
				overflow-x: hidden;
				overflow-y: auto;
				overflow-wrap: anywhere;
				scrollbar-width: thin;
				white-space: pre-wrap;
			}
			:host(.comment-preview-active) .comment-preview-hit-area,
			:host(.comment-preview-active) .comment-preview {
				pointer-events: auto;
			}
			:host(.comment-preview-collapsing) .comment-preview-hit-area,
			:host(.comment-preview-collapsing) .comment-preview {
				pointer-events: none;
			}
			.comment-preview-remove {
				flex: none;
				display: grid;
				place-items: center;
				box-sizing: border-box;
				width: 24px;
				height: 24px;
				margin-block: -2px;
				padding: 0;
				border: 0;
				border-radius: var(--vscode-cornerRadius-small, 4px);
				background: transparent;
				color: var(--vscode-editorWidget-foreground, inherit);
				cursor: pointer;
				font-family: inherit;
			}
			.comment-preview-remove svg {
				display: block;
				width: var(--vscode-codiconFontSize, 16px);
				height: var(--vscode-codiconFontSize, 16px);
			}
			.comment-preview-remove:hover {
				background: var(--vscode-toolbar-hoverBackground, transparent);
			}
			.comment-composer {
				align-items: flex-end; gap: 6px; padding: 6px;
				pointer-events: auto;
			}
			.comment-input {
				flex: 1; min-width: 0; resize: none; overflow: auto;
				scrollbar-width: none;
				box-sizing: border-box; margin: 0; padding: 2px 6px;
				background: transparent; color: inherit;
				border: var(--vscode-strokeThickness, 1px) solid var(--vscode-editorWidget-border, var(--vscode-contrastBorder, #454545));
				border-radius: var(--vscode-cornerRadius-small, 4px);
				outline: 0;
				font: inherit;
				line-height: 20px;
				caret-color: var(--vscode-focusBorder, currentColor);
			}
			.comment-input::-webkit-scrollbar {
				display: none;
			}
			.comment-input::placeholder {
				color: var(--vscode-input-placeholderForeground, var(--vscode-descriptionForeground, #ccccccb3));
				opacity: 1;
			}
			.comment-send {
				box-sizing: border-box; border: 0; cursor: pointer; font-family: inherit;
			}
			.comment-send {
				flex: none; width: 24px; height: 24px; padding: 0;
				border-radius: var(--vscode-cornerRadius-small, 4px);
				background: transparent;
				color: var(--vscode-editorWidget-foreground, #cccccc);
				display: grid;
				place-items: center;
			}
			.comment-send svg {
				display: block;
				width: var(--vscode-codiconFontSize, 16px);
				height: var(--vscode-codiconFontSize, 16px);
			}
			.comment-send:hover {
				background: var(--vscode-toolbar-hoverBackground, transparent);
			}
			.comment-pin {
				position: absolute;
				display: grid;
				place-items: center;
				width: 22px;
				height: 22px;
				transform: translate(-11px, -11px);
				pointer-events: auto;
				z-index: 0;
				transition: opacity 120ms linear;
			}
			.comment-layer.composing .comment-pin {
				opacity: 0;
				pointer-events: none;
				z-index: auto;
			}
			.comment-layer.comment-capture-pending .comment-pin {
				visibility: hidden;
			}
			.comment-pin:hover, .comment-pin:focus-within {
				z-index: 1;
			}
			.comment-pin.previewing {
				z-index: 0;
			}
			:host(.comment-preview-active) .comment-pin:not(.previewing) {
				opacity: 0.35;
			}
			.comment-pin.previewing .comment-pin-bubble {
				width: 6px;
				height: 6px;
				border-width: 0;
			}
			.comment-pin.previewing .comment-pin-number {
				opacity: 0;
			}
			.comment-pin-bubble {
				box-sizing: border-box;
				display: grid;
				place-items: center;
				width: 22px;
				height: 22px;
				padding: 0;
				border: var(--vscode-strokeThickness, 1px) solid var(--vscode-editorWidget-background, #252526);
				border-radius: var(--vscode-cornerRadius-circle, 9999px);
				background: var(--vscode-button-background, #0078d4);
				color: var(--vscode-button-foreground, white);
				box-shadow: 0 2px 6px var(--vscode-widget-shadow, transparent);
				transition: width 140ms cubic-bezier(0.2, 0, 0, 1), height 140ms cubic-bezier(0.2, 0, 0, 1), border-width 140ms cubic-bezier(0.2, 0, 0, 1);
			}
			.comment-pin-number {
				display: block;
				width: 100%;
				font-size: 11px;
				font-weight: 600;
				line-height: 12px;
				text-align: center;
				transition: opacity 80ms linear;
			}
			.comment-send:focus-visible, .comment-preview-remove:focus-visible, .comment-pin:focus-visible, .comment-input:focus-visible {
				outline: 2px solid var(--vscode-focusBorder, #0078d4);
				outline-offset: 2px;
			}
			:host(.reduce-motion) .comment-backdrop-fill,
			:host(.reduce-motion) .comment-pin,
			:host(.reduce-motion) .comment-pin-bubble,
			:host(.reduce-motion) .comment-pin-number {
				transition: none;
			}
			.label {
				position: fixed; box-sizing: border-box;
				display: inline-flex; align-items: center; gap: 6px; height: 20px; padding: 0 6px;
				max-width: min(100%, 320px);
				background: var(--vscode-button-background, #0078d4);
				color: var(--vscode-button-foreground, white);
				font-family: inherit;
				font-size: 11px; line-height: 20px;
				white-space: nowrap;
				border-radius: 2px;
				box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
				z-index: 3;
			}
			.label-info {
				display: inline-block; overflow: hidden; text-overflow: ellipsis; min-width: 0;
			}
			.label-selector {
				font-weight: 600;
			}
			.label-dims {
				flex-shrink: 0; opacity: 0.8;
			}
			.dragbox {
				position: fixed; box-sizing: border-box;
				border: 1px dotted var(--vscode-focusBorder, #a0aabe);
				background: transparent;
				z-index: 2;
			}
		`,e}static _applyTheme(e,t){e.style.setProperty("--vscode-focusBorder",t?.focusBorder??null),e.style.setProperty("--vscode-button-background",t?.buttonBackground??null),e.style.setProperty("--vscode-button-foreground",t?.buttonForeground??null),e.style.setProperty("--vscode-editorWidget-background",t?.widgetBackground??null),e.style.setProperty("--vscode-editorWidget-foreground",t?.widgetForeground??null),e.style.setProperty("--vscode-editorWidget-border",t?.widgetBorder??null),e.style.setProperty("--vscode-widget-shadow",t?.widgetShadow??null),e.style.setProperty("--vscode-contrastBorder",t?.contrastBorder??null),e.style.setProperty("--vscode-descriptionForeground",t?.descriptionForeground??null),e.style.setProperty("--vscode-input-placeholderForeground",t?.inputPlaceholderForeground??null),e.style.setProperty("--vscode-toolbar-hoverBackground",t?.toolbarHoverBackground??null),e.style.setProperty("--pick-font",t?.font??null)}}class I{static{this._MIN_AREA_PX=4}static{this._CURSOR_CROSSHAIR="/* VS Code injected style */ * { cursor: crosshair !important; }"}constructor(e,t){this._onPicked=e,this._onStopped=t,this._selectionActive=!1,this._onPointerDown=r=>{!this._selectionActive||r.button!==0||(this._dragStart={x:r.clientX,y:r.clientY},this._dragbox.style.display="block",this._dragbox.style.left=`${r.clientX}px`,this._dragbox.style.top=`${r.clientY}px`,this._dragbox.style.width="0px",this._dragbox.style.height="0px",r.preventDefault(),r.stopPropagation())},this._onPointerMove=r=>{if(!this._selectionActive||!this._dragStart)return;r.preventDefault(),r.stopPropagation();const m=Math.min(this._dragStart.x,r.clientX),l=Math.min(this._dragStart.y,r.clientY),d=Math.abs(r.clientX-this._dragStart.x),u=Math.abs(r.clientY-this._dragStart.y);this._dragbox.style.left=`${m}px`,this._dragbox.style.top=`${l}px`,this._dragbox.style.width=`${d}px`,this._dragbox.style.height=`${u}px`},this._onPointerUp=r=>{if(!this._selectionActive||!this._dragStart)return;const m=this._dragStart,l=Math.min(m.x,r.clientX),d=Math.min(m.y,r.clientY),u=Math.abs(r.clientX-m.x),_=Math.abs(r.clientY-m.y);if(this._teardown(),r.preventDefault(),r.stopPropagation(),u<I._MIN_AREA_PX||_<I._MIN_AREA_PX){this._onStopped();return}const i=window.visualViewport,h=i?.offsetLeft??0,p=i?.offsetTop??0,g={x:l-h,y:d-p,width:u,height:_};this._onPicked(g)},this._onClick=r=>{this._selectionActive&&(r.preventDefault(),r.stopPropagation())},this._onKeyDown=r=>{this._selectionActive&&r.key==="Escape"&&(this.stop(),r.preventDefault(),r.stopPropagation())};const n=document.createElement("div");n.setAttribute("data-vscode-area-pick-host",""),n.style.cssText="position: absolute; top: 0; left: 0; width: 0; height: 0; z-index: 2147483647; pointer-events: none;";const o=n.attachShadow({mode:"closed"});o.appendChild(I._buildStyle()),this._shadowHost=n;const a=document.createElement("div");a.className="overlay",o.appendChild(a);const c=document.createElement("div");c.className="dragbox",c.style.display="none",o.appendChild(c),this._dragbox=c}start(){if(this._selectionActive)return;this._dragStart=void 0,document.documentElement.appendChild(this._shadowHost),this._selectionActive=!0;const e=document.createElement("style");e.setAttribute("data-vscode-area-pick-cursor",""),e.textContent=I._CURSOR_CROSSHAIR,document.head.appendChild(e),this._cursorStylesheet=e,window.addEventListener("pointermove",this._onPointerMove,!0),window.addEventListener("pointerdown",this._onPointerDown,!0),window.addEventListener("pointerup",this._onPointerUp,!0),window.addEventListener("click",this._onClick,!0),window.addEventListener("contextmenu",this._onClick,!0),window.addEventListener("keydown",this._onKeyDown,!0)}stop(){this._selectionActive&&(this._teardown(),this._onStopped())}_teardown(){this._selectionActive=!1,this._shadowHost.remove(),this._cursorStylesheet?.remove(),this._cursorStylesheet=void 0,window.removeEventListener("pointermove",this._onPointerMove,!0),window.removeEventListener("pointerdown",this._onPointerDown,!0),window.removeEventListener("pointerup",this._onPointerUp,!0),window.removeEventListener("click",this._onClick,!0),window.removeEventListener("contextmenu",this._onClick,!0),window.removeEventListener("keydown",this._onKeyDown,!0),this._dragbox.style.display="none",this._dragbox.style.left="0px",this._dragbox.style.top="0px",this._dragbox.style.width="0px",this._dragbox.style.height="0px",this._dragStart=void 0}setTheme(e){this._shadowHost.style.setProperty("--vscode-focusBorder",e?.focusBorder??null)}static _buildStyle(){const e=document.createElement("style");return e.textContent=`
			:host {
				all: initial;
				pointer-events: none !important;
			}
			.overlay {
				position: fixed; inset: 0;
				background: transparent;
				z-index: 1;
				/* Capture hit-testing so pointer events don't reach the underlying
				 * page during a pick \u2014 otherwise hover/:hover styles would
				 * fire on elements beneath the cursor while we're dragging. */
				pointer-events: auto;
			}
			.dragbox {
				position: fixed; box-sizing: border-box;
				border: 1px dashed var(--vscode-focusBorder, #0078d4);
				background: color-mix(in srgb, var(--vscode-focusBorder, #0078d4) 12%, transparent);
				z-index: 2;
				pointer-events: auto;
			}
		`,e}}Y();export{};

//# sourceMappingURL=https://github.com/VSCodium/sourcemaps/releases/download/stable-1a46a584725d5dd330e0bcd7f5510f24990efcf2/core-vs\platform\browserView\electron-browser\preload-browserView.js.map
