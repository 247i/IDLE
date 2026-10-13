(()=>{"use strict";var e,t={1020:(e,t,o)=>{const i=o(391),n=o(3487),s=o(7107),a=o(9764),r=o(5736),l=document.getElementById("root"),c=JSON.parse(document.getElementById("initial-state").textContent);l&&(0,s.createRoot)(l).render((0,i.jsx)(n.StrictMode,{children:(0,i.jsx)(a.App,{children:(0,i.jsx)(r.ExceptionSubmitterApp,{showLinks:c.showLinks})})}))},1266:(e,t,o)=>{Object.defineProperty(t,"__esModule",{value:!0}),t.useExceptionSubmitterViewModel=function(e,t){const[o,s]=(0,i.useState)([]),[a,r]=(0,i.useState)(!0),[l,c]=(0,i.useState)(null),d=(0,i.useCallback)(async()=>{r(!0);try{const t=await e.ipc.invoke(n.commands.FetchExceptions);s(t),c(null)}finally{r(!1)}},[e.ipc]),p=(0,i.useCallback)(async(t,o)=>{l&&(await e.ipc.notify(n.commands.Submit,{id:l.id,description:t,attachLogs:o}),c(null))},[l,e.ipc]),u=(0,i.useCallback)(async t=>{await e.ipc.notify(n.commands.SubmitAll,t),c(null)},[e.ipc]),h=(0,i.useCallback)(async()=>{await e.ipc.invoke(n.commands.ClearAll),await d()},[e.ipc,d]),b=(0,i.useCallback)(async()=>{await e.ipc.invoke(n.commands.ClearSubmitted),await d()},[e.ipc,d]);return(0,i.useEffect)(()=>{d();const t=e.ipc.onNotification(n.commands.DidObserveException,t=>{try{s(e=>e.some(e=>e.id===t.id)?e.map(e=>e.id===t.id?t:e):[...e,t])}catch(o){e.logger.error(`Failed to append exception ${JSON.stringify(t)}: ${JSON.stringify(o)}`)}});return()=>{t?.dispose()}},[e.ipc,e.logger,d]),{exceptions:o,loading:a,selectedException:l,showLinks:t,reloadExceptions:d,selectException:e=>{c(e)},submitException:p,submitAllExceptions:u,clearAllExceptions:h,clearSubmittedExceptions:b}};const i=o(3487),n=o(2716)},1657:function(e,t,o){var i=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(t,"__esModule",{value:!0}),t.Tabs=function(e){return(0,n.jsx)(s.default,{className:e.className,children:e.children})},t.TabHeader=function(e){return(0,n.jsx)(a.default,{className:e.className,children:e.children})},t.TabPanel=function(e){return(0,n.jsx)(r.default,{className:e.className,children:e.children})};const n=o(391),s=i(o(3326)),a=i(o(6431)),r=i(o(7710))},2042:(e,t,o)=>{o.r(t)},2716:function(e,t,o){var i,n=this&&this.__createBinding||(Object.create?function(e,t,o,i){void 0===i&&(i=o);var n=Object.getOwnPropertyDescriptor(t,o);n&&!("get"in n?!t.__esModule:n.writable||n.configurable)||(n={enumerable:!0,get:function(){return t[o]}}),Object.defineProperty(e,i,n)}:function(e,t,o,i){void 0===i&&(i=o),e[i]=t[o]}),s=this&&this.__setModuleDefault||(Object.create?function(e,t){Object.defineProperty(e,"default",{enumerable:!0,value:t})}:function(e,t){e.default=t}),a=this&&this.__exportStar||function(e,t){for(var o in e)"default"===o||Object.prototype.hasOwnProperty.call(t,o)||n(t,e,o)},r=this&&this.__importStar||(i=function(e){return i=Object.getOwnPropertyNames||function(e){var t=[];for(var o in e)Object.prototype.hasOwnProperty.call(e,o)&&(t[t.length]=o);return t},i(e)},function(e){if(e&&e.__esModule)return e;var t={};if(null!=e)for(var o=i(e),a=0;a<o.length;a++)"default"!==o[a]&&n(t,e,o[a]);return s(t,e),t});Object.defineProperty(t,"__esModule",{value:!0}),t.commands=void 0,a(o(7213),t),a(o(4210),t),t.commands=r(o(8372))},3326:(e,t,o)=>{o.r(t),o.d(t,{default:()=>f});var i=o(3487),n=o(339),s=o(555),a=o(9915),r=o(163);let l=0;var c=o(9990),d=o(6890),p=o(7189);const u=[o(6121).A,s.AH`
    :host {
      display: block;
    }

    .header {
      align-items: center;
      display: flex;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      font-weight: var(--vscode-font-weight);
      width: 100%;
    }

    .header {
      border-bottom-color: var(--vscode-settings-headerBorder);
      border-bottom-style: solid;
      border-bottom-width: 1px;
    }

    .header.panel {
      background-color: var(--vscode-panel-background);
      border-bottom-width: 0;
      box-sizing: border-box;
      padding-left: 8px;
      padding-right: 8px;
    }

    slot[name='addons'] {
      display: block;
      margin-left: auto;
    }
  `];var h=function(e,t,o,i){var n,s=arguments.length,a=s<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,o,i);else for(var r=e.length-1;r>=0;r--)(n=e[r])&&(a=(s<3?n(a):s>3?n(t,o,a):n(t,o))||a);return s>3&&a&&Object.defineProperty(t,o,a),a};let b=class extends c.N{constructor(){super(),this.panel=!1,this.role="tablist",this.selectedIndex=0,this._tabHeaders=[],this._tabPanels=[],this._componentId="",this._tabFocus=0,this._componentId=((e="")=>(l++,`${e}${l}`))()}attributeChangedCallback(e,t,o){super.attributeChangedCallback(e,t,o),"selected-index"===e&&this._setActiveTab(),"panel"===e&&(this._tabHeaders.forEach(e=>e.panel=null!==o),this._tabPanels.forEach(e=>e.panel=null!==o))}_dispatchSelectEvent(){this.dispatchEvent(new CustomEvent("vsc-select",{detail:{selectedIndex:this.selectedIndex},composed:!0})),this.dispatchEvent(new CustomEvent("vsc-tabs-select",{detail:{selectedIndex:this.selectedIndex},composed:!0}))}_setActiveTab(){this._tabFocus=this.selectedIndex,this._tabPanels.forEach((e,t)=>{e.hidden=t!==this.selectedIndex}),this._tabHeaders.forEach((e,t)=>{e.active=t===this.selectedIndex})}_focusPrevTab(){0===this._tabFocus?this._tabFocus=this._tabHeaders.length-1:this._tabFocus-=1}_focusNextTab(){this._tabFocus===this._tabHeaders.length-1?this._tabFocus=0:this._tabFocus+=1}_onHeaderKeyDown(e){"ArrowLeft"!==e.key&&"ArrowRight"!==e.key||(e.preventDefault(),this._tabHeaders[this._tabFocus].setAttribute("tabindex","-1"),"ArrowLeft"===e.key?this._focusPrevTab():"ArrowRight"===e.key&&this._focusNextTab(),this._tabHeaders[this._tabFocus].setAttribute("tabindex","0"),this._tabHeaders[this._tabFocus].focus()),"Enter"===e.key&&(e.preventDefault(),this.selectedIndex=this._tabFocus,this._dispatchSelectEvent())}_moveHeadersToHeaderSlot(){const e=this._mainSlotElements.filter(e=>e instanceof d.Z);e.length>0&&e.forEach(e=>e.setAttribute("slot","header"))}_onMainSlotChange(){this._moveHeadersToHeaderSlot(),this._tabPanels=this._mainSlotElements.filter(e=>e instanceof p.W),this._tabPanels.forEach((e,t)=>{e.ariaLabelledby=`t${this._componentId}-h${t}`,e.id=`t${this._componentId}-p${t}`,e.panel=this.panel}),this._setActiveTab()}_onHeaderSlotChange(){this._tabHeaders=this._headerSlotElements.filter(e=>e instanceof d.Z),this._tabHeaders.forEach((e,t)=>{e.tabId=t,e.id=`t${this._componentId}-h${t}`,e.ariaControls=`t${this._componentId}-p${t}`,e.panel=this.panel,e.active=t===this.selectedIndex})}_onHeaderClick(e){const t=e.composedPath().find(e=>e instanceof d.Z);t&&(this.selectedIndex=t.tabId,this._setActiveTab(),this._dispatchSelectEvent())}render(){return s.qy`
      <div
        class=${(0,r.H)({header:!0,panel:this.panel})}
        @click=${this._onHeaderClick}
        @keydown=${this._onHeaderKeyDown}
      >
        <slot name="header" @slotchange=${this._onHeaderSlotChange}></slot>
        <slot name="addons"></slot>
      </div>
      <slot @slotchange=${this._onMainSlotChange}></slot>
    `}};b.styles=u,h([(0,a.MZ)({type:Boolean,reflect:!0})],b.prototype,"panel",void 0),h([(0,a.MZ)({reflect:!0})],b.prototype,"role",void 0),h([(0,a.MZ)({type:Number,reflect:!0,attribute:"selected-index"})],b.prototype,"selectedIndex",void 0),h([(0,a.KN)({slot:"header"})],b.prototype,"_headerSlotElements",void 0),h([(0,a.KN)()],b.prototype,"_mainSlotElements",void 0),b=h([(0,c.E)("vscode-tabs")],b);const f=(0,n.a)({tagName:"vscode-tabs",elementClass:b,react:i,events:{onVscTabsSelect:"vsc-tabs-select"},displayName:"VscodeTabs"})},4210:(e,t)=>{Object.defineProperty(t,"__esModule",{value:!0})},5171:function(e,t,o){var i=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(t,"__esModule",{value:!0}),t.ExceptionSubmitterView=function(e){const{viewModel:t}=e;if(t.loading)return(0,n.jsx)(a.Loader,{});const o=t.exceptions.filter(e=>"submitted"!==e.state),i=t.exceptions.filter(e=>"submitted"===e.state);return(0,n.jsxs)(r.Tabs,{className:"container",children:[(0,n.jsx)(r.TabHeader,{children:"Unsubmitted"}),(0,n.jsx)(r.TabPanel,{className:"root",children:(0,n.jsx)(u,{submitted:!1,exceptions:o,onSubmit:t.submitException,onSubmitAll:t.submitAllExceptions,onClearAll:t.clearAllExceptions,selectedId:t.selectedException?.id,onSelect:t.selectException,exception:"submitted"!==t.selectedException?.state?t.selectedException:null,showLinks:t.showLinks})}),(0,n.jsx)(r.TabHeader,{children:"Submitted"}),(0,n.jsx)(r.TabPanel,{className:"root",children:(0,n.jsx)(u,{submitted:!0,exceptions:i,selectedId:t.selectedException?.id,onSelect:t.selectException,exception:"submitted"===t.selectedException?.state?t.selectedException:null,onSubmit:()=>{},onSubmitAll:()=>{},onClearAll:t.clearSubmittedExceptions,showLinks:t.showLinks})})]})};const n=o(391),s=i(o(3835)),a=o(9764),r=o(1657);o(2042);const l=o(3487);function c(e){const t=[{title:"Message",getValue:e=>e.text,width:"auto"},{title:"Count",getValue:e=>e.count,width:"70px"},{title:"Last observed",getValue:e=>e.lastObserved.toString(),width:"200px"}];return e.submitted&&e.showLinks&&t.push({title:"Link",getValue:e=>(0,n.jsx)("a",{href:e.issueUrl,children:e.issueUrl?.substring(e.issueUrl?.lastIndexOf("/")+1)}),width:"100px"}),(0,n.jsx)("div",{className:"exceptionsList",children:(0,n.jsx)("div",{children:(0,n.jsx)(a.Scrollable,{children:(0,n.jsx)(a.Table,{rows:e.exceptions,onClickRow:e.onSelect,columns:t,rowClassName:t=>(0,s.default)("row",e.selectedId===t.id?"selected":null)})})})})}function d(e){const[t,o]=(0,l.useState)(""),[i,s]=(0,l.useState)(!1);return(0,n.jsx)("div",{className:"exceptionDetails",children:e.exception?(0,n.jsxs)("div",{className:"content",children:[!e.submitted&&(0,n.jsxs)("span",{children:[(0,n.jsx)("div",{className:"caption",children:"Description:"}),(0,n.jsx)(a.Textarea,{value:t,monospace:!0,readonly:!1,className:"description",onChange:e=>o(e.target.value),placeholder:"Comment on what you were doing when the exception occurred"})]}),(0,n.jsxs)("div",{className:"stacktrace-header",children:[(0,n.jsx)("div",{className:"caption",children:"Stacktrace:"}),!e.submitted&&(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)(a.Button,{onClick:()=>e.onSubmit(t,i),width:"fit-content",children:"Submit"}),(0,n.jsxs)("label",{className:"checkbox-label",children:[(0,n.jsx)("input",{type:"checkbox",checked:i,onChange:e=>s(e.target.checked)}),"Attach logs"]})]})]}),(0,n.jsx)("div",{className:"stacktraceBlock",children:(0,n.jsx)(a.Textarea,{value:e.exception.stack,monospace:!0,readonly:!0,className:"stacktrace"})})]}):(0,n.jsx)("div",{className:"empty",children:"Click on exception to see details"})})}function p(e){const[t,o]=(0,l.useState)(!1),i=e.exceptions.length>0;return(0,n.jsxs)("div",{className:"summary",children:[(0,n.jsxs)("span",{className:"summary-left",children:[(0,n.jsxs)("span",{className:"title",children:["Exceptions count: ",e.exceptions.length]}),!e.submitted&&(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)(a.Button,{width:"fit-content",onClick:()=>e.onSubmitAll(t),disabled:!i,children:"Submit All"}),(0,n.jsxs)("label",{className:"checkbox-label",children:[(0,n.jsx)("input",{type:"checkbox",checked:t,onChange:e=>o(e.target.checked),disabled:!i}),"Attach logs"]})]})]}),(0,n.jsx)(a.Button,{width:"fit-content",onClick:e.onClearAll,disabled:!i,children:"Clear All"})]})}function u(e){return(0,n.jsxs)("div",{className:"root",children:[(0,n.jsx)(p,{submitted:e.submitted,exceptions:e.exceptions,onSubmitAll:e.onSubmitAll,onClearAll:e.onClearAll}),(0,n.jsx)(c,{submitted:e.submitted,exceptions:e.exceptions,selectedId:e.selectedId,onSelect:e.onSelect,showLinks:e.showLinks}),(0,n.jsx)(a.Divider,{}),(0,n.jsx)(d,{submitted:e.submitted,exception:e.exception,onSubmit:e.onSubmit})]})}},5263:(e,t,o)=>{Object.defineProperty(t,"__esModule",{value:!0}),t.ExceptionSubmitterApp=function(e){const t=(0,n.useContext)(s.AppContext),o=(0,a.useExceptionSubmitterViewModel)(t,e.showLinks);return(0,i.jsx)(r.ExceptionSubmitterView,{viewModel:o})};const i=o(391),n=o(3487),s=o(9764),a=o(1266),r=o(5171)},5736:function(e,t,o){var i=this&&this.__createBinding||(Object.create?function(e,t,o,i){void 0===i&&(i=o);var n=Object.getOwnPropertyDescriptor(t,o);n&&!("get"in n?!t.__esModule:n.writable||n.configurable)||(n={enumerable:!0,get:function(){return t[o]}}),Object.defineProperty(e,i,n)}:function(e,t,o,i){void 0===i&&(i=o),e[i]=t[o]}),n=this&&this.__exportStar||function(e,t){for(var o in e)"default"===o||Object.prototype.hasOwnProperty.call(t,o)||i(t,e,o)};Object.defineProperty(t,"__esModule",{value:!0}),n(o(5263),t),n(o(5171),t),n(o(1266),t)},6431:(e,t,o)=>{o.r(t),o.d(t,{default:()=>a});var i=o(3487),n=o(339),s=o(6890);const a=(0,n.a)({tagName:"vscode-tab-header",elementClass:s.Z,react:i,displayName:"VscTabHeader"})},6890:(e,t,o)=>{o.d(t,{Z:()=>c});var i=o(555),n=o(9915),s=o(163),a=o(9990);const r=[o(6121).A,i.AH`
    :host {
      border-bottom: 1px solid transparent;
      cursor: pointer;
      display: block;
      margin-bottom: -1px;
      overflow: hidden;
      padding: 7px 8px;
      text-overflow: ellipsis;
      user-select: none;
      white-space: nowrap;
    }

    :host([active]) {
      border-bottom-color: var(--vscode-panelTitle-activeForeground);
      color: var(--vscode-panelTitle-activeForeground);
    }

    :host([panel]) {
      border-bottom: 0;
      margin-bottom: 0;
      padding: 0;
    }

    :host(:focus-visible) {
      outline: none;
    }

    .wrapper {
      align-items: center;
      color: var(--vscode-foreground);
      display: flex;
      min-height: 20px;
      overflow: inherit;
      text-overflow: inherit;
      position: relative;
    }

    .wrapper.panel {
      color: var(--vscode-panelTitle-inactiveForeground);
    }

    .wrapper.panel.active,
    .wrapper.panel:hover {
      color: var(--vscode-panelTitle-activeForeground);
    }

    :host([panel]) .wrapper {
      display: flex;
      font-size: 11px;
      height: 31px;
      padding: 2px 10px;
      text-transform: uppercase;
    }

    .main {
      overflow: inherit;
      text-overflow: inherit;
    }

    .active-indicator {
      display: none;
    }

    .active-indicator.panel.active {
      border-top: 1px solid var(--vscode-panelTitle-activeBorder);
      bottom: 4px;
      display: block;
      left: 8px;
      pointer-events: none;
      position: absolute;
      right: 8px;
    }

    :host(:focus-visible) .wrapper {
      outline-color: var(--vscode-focusBorder);
      outline-offset: 3px;
      outline-style: solid;
      outline-width: 1px;
    }

    :host(:focus-visible) .wrapper.panel {
      outline-offset: -2px;
    }

    slot[name='content-before']::slotted(vscode-badge) {
      margin-right: 8px;
    }

    slot[name='content-after']::slotted(vscode-badge) {
      margin-left: 8px;
    }
  `];var l=function(e,t,o,i){var n,s=arguments.length,a=s<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,o,i);else for(var r=e.length-1;r>=0;r--)(n=e[r])&&(a=(s<3?n(a):s>3?n(t,o,a):n(t,o))||a);return s>3&&a&&Object.defineProperty(t,o,a),a};let c=class extends a.N{constructor(){super(...arguments),this.active=!1,this.ariaControls="",this.panel=!1,this.role="tab",this.tabId=-1}attributeChangedCallback(e,t,o){if(super.attributeChangedCallback(e,t,o),"active"===e){const e=null!==o;this.ariaSelected=e?"true":"false",this.tabIndex=e?0:-1}}render(){return i.qy`
      <div
        class=${(0,s.H)({wrapper:!0,active:this.active,panel:this.panel})}
      >
        <div class="before"><slot name="content-before"></slot></div>
        <div class="main"><slot></slot></div>
        <div class="after"><slot name="content-after"></slot></div>
        <span
          class=${(0,s.H)({"active-indicator":!0,active:this.active,panel:this.panel})}
        ></span>
      </div>
    `}};c.styles=r,l([(0,n.MZ)({type:Boolean,reflect:!0})],c.prototype,"active",void 0),l([(0,n.MZ)({reflect:!0,attribute:"aria-controls"})],c.prototype,"ariaControls",void 0),l([(0,n.MZ)({type:Boolean,reflect:!0})],c.prototype,"panel",void 0),l([(0,n.MZ)({reflect:!0})],c.prototype,"role",void 0),l([(0,n.MZ)({type:Number,reflect:!0,attribute:"tab-id"})],c.prototype,"tabId",void 0),c=l([(0,a.E)("vscode-tab-header")],c)},7189:(e,t,o)=>{o.d(t,{W:()=>l});var i=o(555),n=o(9915),s=o(9990);const a=[o(6121).A,i.AH`
    :host {
      display: block;
      overflow: hidden;
    }

    :host(:focus-visible) {
      outline-color: var(--vscode-focusBorder);
      outline-offset: 3px;
      outline-style: solid;
      outline-width: 1px;
    }

    :host([panel]) {
      background-color: var(--vscode-panel-background);
    }
  `];var r=function(e,t,o,i){var n,s=arguments.length,a=s<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,o,i);else for(var r=e.length-1;r>=0;r--)(n=e[r])&&(a=(s<3?n(a):s>3?n(t,o,a):n(t,o))||a);return s>3&&a&&Object.defineProperty(t,o,a),a};let l=class extends s.N{constructor(){super(...arguments),this.hidden=!1,this.ariaLabelledby="",this.panel=!1,this.role="tabpanel",this.tabIndex=0}render(){return i.qy` <slot></slot> `}};l.styles=a,r([(0,n.MZ)({type:Boolean,reflect:!0})],l.prototype,"hidden",void 0),r([(0,n.MZ)({reflect:!0,attribute:"aria-labelledby"})],l.prototype,"ariaLabelledby",void 0),r([(0,n.MZ)({type:Boolean,reflect:!0})],l.prototype,"panel",void 0),r([(0,n.MZ)({reflect:!0})],l.prototype,"role",void 0),r([(0,n.MZ)({type:Number,reflect:!0})],l.prototype,"tabIndex",void 0),l=r([(0,s.E)("vscode-tab-panel")],l)},7213:(e,t)=>{Object.defineProperty(t,"__esModule",{value:!0})},7710:(e,t,o)=>{o.r(t),o.d(t,{default:()=>a});var i=o(3487),n=o(339),s=o(7189);const a=(0,n.a)({tagName:"vscode-tab-panel",elementClass:s.W,react:i,displayName:"VscodeTabPanel"})},8372:(e,t,o)=>{Object.defineProperty(t,"__esModule",{value:!0}),t.ThrowBackendException=t.RejectFrontendPromise=t.ThrowFrontendException=t.ClearSubmitted=t.ClearAll=t.SubmitAll=t.Submit=t.DidObserveException=t.FetchExceptions=void 0;const i=o(9345);t.FetchExceptions=new i.IpcRequest("errorSubmitter/fetchExceptions"),t.DidObserveException=new i.IpcNotification("errorSubmitter/didObserveException"),t.Submit=new i.IpcNotification("errorSubmitter/submit"),t.SubmitAll=new i.IpcNotification("errorSubmitter/submitAll"),t.ClearAll=new i.IpcRequest("errorSubmitter/сlearAll"),t.ClearSubmitted=new i.IpcRequest("errorSubmitter/clearSubmitted"),t.ThrowFrontendException=new i.IpcNotification("errorSubmitter/throwFrontentException"),t.RejectFrontendPromise=new i.IpcNotification("errorSubmitter/rejectFrontendPromise"),t.ThrowBackendException=new i.IpcNotification("errorSubmitter/throwBackendException")}},o={};function i(e){var n=o[e];if(void 0!==n)return n.exports;var s=o[e]={exports:{}};return t[e].call(s.exports,s,s.exports,i),s.exports}i.m=t,e=[],i.O=(t,o,n,s)=>{if(!o){var a=1/0;for(d=0;d<e.length;d++){for(var[o,n,s]=e[d],r=!0,l=0;l<o.length;l++)(!1&s||a>=s)&&Object.keys(i.O).every(e=>i.O[e](o[l]))?o.splice(l--,1):(r=!1,s<a&&(a=s));if(r){e.splice(d--,1);var c=n();void 0!==c&&(t=c)}}return t}s=s||0;for(var d=e.length;d>0&&e[d-1][2]>s;d--)e[d]=e[d-1];e[d]=[o,n,s]},i.d=(e,t)=>{for(var o in t)i.o(t,o)&&!i.o(e,o)&&Object.defineProperty(e,o,{enumerable:!0,get:t[o]})},i.o=(e,t)=>Object.prototype.hasOwnProperty.call(e,t),i.r=e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},(()=>{var e={603:0};i.O.j=t=>0===e[t];var t=(t,o)=>{var n,s,[a,r,l]=o,c=0;if(a.some(t=>0!==e[t])){for(n in r)i.o(r,n)&&(i.m[n]=r[n]);if(l)var d=l(i)}for(t&&t(o);c<a.length;c++)s=a[c],i.o(e,s)&&e[s]&&e[s][0](),e[s]=0;return i.O(d)},o=self.webpackChunkresharper_code=self.webpackChunkresharper_code||[];o.forEach(t.bind(null,0)),o.push=t.bind(null,o.push.bind(o))})();var n=i.O(void 0,[852],()=>i(1020));n=i.O(n)})();