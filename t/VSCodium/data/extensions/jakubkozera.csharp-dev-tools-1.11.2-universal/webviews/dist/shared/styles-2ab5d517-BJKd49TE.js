import{l as y,c as S,d as $,A as F,o as P,p as A,q as L,r as N,u as I,k as z,t as M,B as R}from"../excalidraw/assets/excalidraw-BB-x1HNU.js";import{s as U,b as H}from"./add-html-label-DRKq8VAN.js";import{G as K}from"./graph-VvgM4L7n.js";import{r as W}from"./index-6079d271-P0irvcrU.js";import{c as X}from"./channel-Da6jk6J_.js";const G={},J=function(t){const s=Object.keys(t);for(const h of s)G[h]=t[h]},V=async function(t,s,h,i,n,b){const f=i.select(`[id="${h}"]`),a=Object.keys(t);for(const c of a){const l=t[c];let g="default";l.classes.length>0&&(g=l.classes.join(" ")),g=g+" flowchart-label";const w=A(l.styles);let e=l.text!==void 0?l.text:l.id,o;if(y.info("vertex",l,l.labelType),l.labelType==="markdown")y.info("vertex",l,l.labelType);else if(M(S().flowchart.htmlLabels))o=H(f,{label:e}).node(),o.parentNode.removeChild(o);else{const k=n.createElementNS("http://www.w3.org/2000/svg","text");k.setAttribute("style",w.labelStyle.replace("color:","fill:"));const _=e.split(z.lineBreakRegex);for(const C of _){const v=n.createElementNS("http://www.w3.org/2000/svg","tspan");v.setAttributeNS("http://www.w3.org/XML/1998/namespace","xml:space","preserve"),v.setAttribute("dy","1em"),v.setAttribute("x","1"),v.textContent=C,k.appendChild(v)}o=k}let d=0,r="";switch(l.type){case"round":d=5,r="rect";break;case"square":r="rect";break;case"diamond":r="question";break;case"hexagon":r="hexagon";break;case"odd":r="rect_left_inv_arrow";break;case"lean_right":r="lean_right";break;case"lean_left":r="lean_left";break;case"trapezoid":r="trapezoid";break;case"inv_trapezoid":r="inv_trapezoid";break;case"odd_right":r="rect_left_inv_arrow";break;case"circle":r="circle";break;case"ellipse":r="ellipse";break;case"stadium":r="stadium";break;case"subroutine":r="subroutine";break;case"cylinder":r="cylinder";break;case"group":r="rect";break;case"doublecircle":r="doublecircle";break;default:r="rect"}const T=await I(e,S());s.setNode(l.id,{labelStyle:w.labelStyle,shape:r,labelText:T,labelType:l.labelType,rx:d,ry:d,class:g,style:w.style,id:l.id,link:l.link,linkTarget:l.linkTarget,tooltip:b.db.getTooltip(l.id)||"",domId:b.db.lookUpDomId(l.id),haveCallback:l.haveCallback,width:l.type==="group"?500:void 0,dir:l.dir,type:l.type,props:l.props,padding:S().flowchart.padding}),y.info("setNode",{labelStyle:w.labelStyle,labelType:l.labelType,shape:r,labelText:T,rx:d,ry:d,class:g,style:w.style,id:l.id,domId:b.db.lookUpDomId(l.id),width:l.type==="group"?500:void 0,type:l.type,dir:l.dir,props:l.props,padding:S().flowchart.padding})}},q=async function(t,s,h){y.info("abc78 edges = ",t);let i=0,n={},b,f;if(t.defaultStyle!==void 0){const a=A(t.defaultStyle);b=a.style,f=a.labelStyle}for(const a of t){i++;const c="L-"+a.start+"-"+a.end;n[c]===void 0?(n[c]=0,y.info("abc78 new entry",c,n[c])):(n[c]++,y.info("abc78 new entry",c,n[c]));let l=c+"-"+n[c];y.info("abc78 new link id to be used is",c,l,n[c]);const g="LS-"+a.start,w="LE-"+a.end,e={style:"",labelStyle:""};switch(e.minlen=a.length||1,a.type==="arrow_open"?e.arrowhead="none":e.arrowhead="normal",e.arrowTypeStart="arrow_open",e.arrowTypeEnd="arrow_open",a.type){case"double_arrow_cross":e.arrowTypeStart="arrow_cross";case"arrow_cross":e.arrowTypeEnd="arrow_cross";break;case"double_arrow_point":e.arrowTypeStart="arrow_point";case"arrow_point":e.arrowTypeEnd="arrow_point";break;case"double_arrow_circle":e.arrowTypeStart="arrow_circle";case"arrow_circle":e.arrowTypeEnd="arrow_circle";break}let o="",d="";switch(a.stroke){case"normal":o="fill:none;",b!==void 0&&(o=b),f!==void 0&&(d=f),e.thickness="normal",e.pattern="solid";break;case"dotted":e.thickness="normal",e.pattern="dotted",e.style="fill:none;stroke-width:2px;stroke-dasharray:3;";break;case"thick":e.thickness="thick",e.pattern="solid",e.style="stroke-width: 3.5px;fill:none;";break;case"invisible":e.thickness="invisible",e.pattern="solid",e.style="stroke-width: 0;fill:none;";break}if(a.style!==void 0){const r=A(a.style);o=r.style,d=r.labelStyle}e.style=e.style+=o,e.labelStyle=e.labelStyle+=d,a.interpolate!==void 0?e.curve=L(a.interpolate,N):t.defaultInterpolate!==void 0?e.curve=L(t.defaultInterpolate,N):e.curve=L(G.curve,N),a.text===void 0?a.style!==void 0&&(e.arrowheadStyle="fill: #333"):(e.arrowheadStyle="fill: #333",e.labelpos="c"),e.labelType=a.labelType,e.label=await I(a.text.replace(z.lineBreakRegex,`
`),S()),a.style===void 0&&(e.style=e.style||"stroke: #333; stroke-width: 1.5px;fill:none;"),e.labelStyle=e.labelStyle.replace("color:","fill:"),e.id=l,e.classes="flowchart-link "+g+" "+w,s.setEdge(a.start,a.end,e,i)}},Q=function(t,s){return s.db.getClasses()},Y=async function(t,s,h,i){y.info("Drawing flowchart");let n=i.db.getDirection();n===void 0&&(n="TD");const{securityLevel:b,flowchart:f}=S(),a=f.nodeSpacing||50,c=f.rankSpacing||50;let l;b==="sandbox"&&(l=$("#i"+s));const g=b==="sandbox"?$(l.nodes()[0].contentDocument.body):$("body"),w=b==="sandbox"?l.nodes()[0].contentDocument:document,e=new K({multigraph:!0,compound:!0}).setGraph({rankdir:n,nodesep:a,ranksep:c,marginx:0,marginy:0}).setDefaultEdgeLabel(function(){return{}});let o;const d=i.db.getSubGraphs();y.info("Subgraphs - ",d);for(let p=d.length-1;p>=0;p--)o=d[p],y.info("Subgraph - ",o),i.db.addVertex(o.id,{text:o.title,type:o.labelType},"group",void 0,o.classes,o.dir);const r=i.db.getVertices(),T=i.db.getEdges();y.info("Edges",T);let k=0;for(k=d.length-1;k>=0;k--){o=d[k],U("cluster").append("text");for(let p=0;p<o.nodes.length;p++)y.info("Setting up subgraphs",o.nodes[p],o.id),e.setParent(o.nodes[p],o.id)}await V(r,e,s,g,w,i),await q(T,e);const _=g.select(`[id="${s}"]`),C=g.select("#"+s+" g");if(await W(C,e,["point","circle","cross"],"flowchart",s),F.insertTitle(_,"flowchartTitleText",f.titleTopMargin,i.db.getDiagramTitle()),P(e,_,f.diagramPadding,f.useMaxWidth),i.db.indexNodes("subGraph"+k),!f.htmlLabels){const p=w.querySelectorAll('[id="'+s+'"] .edgeLabel .label');for(const x of p){const m=x.getBBox(),u=w.createElementNS("http://www.w3.org/2000/svg","rect");u.setAttribute("rx",0),u.setAttribute("ry",0),u.setAttribute("width",m.width),u.setAttribute("height",m.height),x.insertBefore(u,x.firstChild)}}Object.keys(r).forEach(function(p){const x=r[p];if(x.link){const m=$("#"+s+' [id="'+p+'"]');if(m){const u=w.createElementNS("http://www.w3.org/2000/svg","a");u.setAttributeNS("http://www.w3.org/2000/svg","class",x.classes.join(" ")),u.setAttributeNS("http://www.w3.org/2000/svg","href",x.link),u.setAttributeNS("http://www.w3.org/2000/svg","rel","noopener"),b==="sandbox"?u.setAttributeNS("http://www.w3.org/2000/svg","target","_top"):x.linkTarget&&u.setAttributeNS("http://www.w3.org/2000/svg","target",x.linkTarget);const E=m.insert(function(){return u},":first-child"),B=m.select(".label-container");B&&E.append(function(){return B.node()});const D=m.select(".label");D&&E.append(function(){return D.node()})}}})},ae={setConf:J,addVertices:V,addEdges:q,getClasses:Q,draw:Y},Z=(t,s)=>{const h=X,i=h(t,"r"),n=h(t,"g"),b=h(t,"b");return R(i,n,b,s)},j=t=>`.label {
    font-family: ${t.fontFamily};
    color: ${t.nodeTextColor||t.textColor};
  }
  .cluster-label text {
    fill: ${t.titleColor};
  }
  .cluster-label span,p {
    color: ${t.titleColor};
  }

  .label text,span,p {
    fill: ${t.nodeTextColor||t.textColor};
    color: ${t.nodeTextColor||t.textColor};
  }

  .node rect,
  .node circle,
  .node ellipse,
  .node polygon,
  .node path {
    fill: ${t.mainBkg};
    stroke: ${t.nodeBorder};
    stroke-width: 1px;
  }
  .flowchart-label text {
    text-anchor: middle;
  }
  // .flowchart-label .text-outer-tspan {
  //   text-anchor: middle;
  // }
  // .flowchart-label .text-inner-tspan {
  //   text-anchor: start;
  // }

  .node .katex path {
    fill: #000;
    stroke: #000;
    stroke-width: 1px;
  }

  .node .label {
    text-align: center;
  }
  .node.clickable {
    cursor: pointer;
  }

  .arrowheadPath {
    fill: ${t.arrowheadColor};
  }

  .edgePath .path {
    stroke: ${t.lineColor};
    stroke-width: 2.0px;
  }

  .flowchart-link {
    stroke: ${t.lineColor};
    fill: none;
  }

  .edgeLabel {
    background-color: ${t.edgeLabelBackground};
    rect {
      opacity: 0.5;
      background-color: ${t.edgeLabelBackground};
      fill: ${t.edgeLabelBackground};
    }
    text-align: center;
  }

  /* For html labels only */
  .labelBkg {
    background-color: ${Z(t.edgeLabelBackground,.5)};
    // background-color: 
  }

  .cluster rect {
    fill: ${t.clusterBkg};
    stroke: ${t.clusterBorder};
    stroke-width: 1px;
  }

  .cluster text {
    fill: ${t.titleColor};
  }

  .cluster span,p {
    color: ${t.titleColor};
  }
  /* .cluster div {
    color: ${t.titleColor};
  } */

  div.mermaidTooltip {
    position: absolute;
    text-align: center;
    max-width: 200px;
    padding: 2px;
    font-family: ${t.fontFamily};
    font-size: 12px;
    background: ${t.tertiaryColor};
    border: 1px solid ${t.border2};
    border-radius: 2px;
    pointer-events: none;
    z-index: 100;
  }

  .flowchartTitleText {
    text-anchor: middle;
    font-size: 18px;
    fill: ${t.textColor};
  }
`,oe=j;export{ae as a,oe as f};
