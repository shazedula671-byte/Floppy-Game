import { SerializedBrain } from './neuralNet';

export interface GeneratedBotBundles {
  consoleScript: string;
  bookmarkletUri: string;
  userscript: string;
  htmlEmbedSnippet: string;
}

/**
 * Generates self-contained, zero-dependency JavaScript bundles carrying
 * the user's trained 5-6-1 Neural Network weights, dual-mode detection:
 *   1) Precision SVG/DOM engine (built specifically for quest.feather.games
 *      and SVG/DOM Flappy Bird implementations)
 *   2) Real-time HTML5 <canvas> Pixel-Vision scanner
 * Includes online reinforcement self-calibration and a draggable HUD.
 */
export function buildUniversalBotBundles(brain: SerializedBrain): GeneratedBotBundles {
  const compactBrain = {
    i: brain.inputSize,
    h: brain.hiddenSize,
    w1: brain.weightsIH.map((n) => Number(n.toFixed(4))),
    b1: brain.biasH.map((n) => Number(n.toFixed(4))),
    w2: brain.weightsHO.map((n) => Number(n.toFixed(4))),
    b2: Number(brain.biasO[0].toFixed(4)),
  };

  const brainJson = JSON.stringify(compactBrain);

  const rawIife = `(function(){
  if(window.__flappyMLBotDestroy){window.__flappyMLBotDestroy();return;}
  var BRAIN=${brainJson};
  var STORAGE_KEY="flappyml_autotune_"+location.hostname;
  var state={
    running:true,
    autoTune:true,
    showVision:true,
    autoRestart:true,
    biasOffset:parseFloat(localStorage.getItem(STORAGE_KEY)||"0")||0,
    episodes:1,
    flaps:0,
    cooldown:0,
    prevBirdY:0.45,
    smoothVy:0,
    lastTime:performance.now(),
    lastRestartAt:0,
    wasBannerVisible:false,
    lastGapCenter:0.5,
    lastGapBottom:0.62,
    lastPipeX:0.85,
    stallFrames:0,
    lastFrameHash:0,
    targetCanvas:null,
    rafId:0,
    lastOutput:0
  };

  function sig(x){var c=Math.max(-15,Math.min(15,x));return 1/(1+Math.exp(-c));}
  function predict(inp){
    var hid=[],h,i,s;
    for(h=0;h<BRAIN.h;h++){
      s=BRAIN.b1[h];
      for(i=0;i<BRAIN.i;i++)s+=inp[i]*BRAIN.w1[h*BRAIN.i+i];
      hid[h]=Math.tanh(s);
    }
    var out=BRAIN.b2;
    for(h=0;h<BRAIN.h;h++)out+=hid[h]*BRAIN.w2[h];
    return sig(out);
  }

  function findLargestCanvas(){
    var list=Array.from(document.querySelectorAll("canvas"));
    var frames=document.querySelectorAll("iframe");
    for(var f=0;f<frames.length;f++){
      try{
        var doc=frames[f].contentDocument;
        if(doc)list=list.concat(Array.from(doc.querySelectorAll("canvas")));
      }catch(e){}
    }
    var best=null,bestArea=0;
    list.forEach(function(c){
      var r=c.getBoundingClientRect();
      var area=r.width*r.height;
      if(r.width>120&&r.height>120&&area>bestArea){best=c;bestArea=area;}
    });
    return best;
  }

  function triggerFlap(targetEl,keyOnly){
    var doc=(targetEl&&targetEl.ownerDocument)||document;
    var win=doc.defaultView||window;
    var kd=new KeyboardEvent("keydown",{key:" ",code:"Space",keyCode:32,which:32,bubbles:true,cancelable:true});
    var ku=new KeyboardEvent("keyup",{key:" ",code:"Space",keyCode:32,which:32,bubbles:true,cancelable:true});
    win.dispatchEvent(kd);
    doc.dispatchEvent(kd);
    if(targetEl&&!keyOnly){
      targetEl.dispatchEvent(kd);
      var rect=targetEl.getBoundingClientRect();
      var cx=rect.left+rect.width*0.5,cy=rect.top+rect.height*0.5;
      ["pointerdown","mousedown","click","pointerup","mouseup"].forEach(function(t){
        try{
          var ev=t.indexOf("pointer")===0&&window.PointerEvent
            ? new PointerEvent(t,{clientX:cx,clientY:cy,bubbles:true,cancelable:true,pointerId:1})
            : new MouseEvent(t,{clientX:cx,clientY:cy,bubbles:true,cancelable:true});
          targetEl.dispatchEvent(ev);
        }catch(e){}
      });
    }
    setTimeout(function(){
      win.dispatchEvent(ku);
      doc.dispatchEvent(ku);
    },35);
  }

  var scanW=104,scanH=112;
  var off=document.createElement("canvas");
  off.width=scanW;off.height=scanH;
  var offCtx=off.getContext("2d",{willReadFrequently:true});

  var overlay=document.createElement("canvas");
  overlay.style.cssText="position:fixed;pointer-events:none;z-index:2147483646;";
  document.body.appendChild(overlay);
  var ovCtx=overlay.getContext("2d");

  var hud=document.createElement("div");
  hud.style.cssText="position:fixed;top:14px;right:14px;z-index:2147483647;width:256px;background:#0f172a;color:#f8fafc;border:1px solid #334155;border-radius:10px;padding:12px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;box-shadow:0 12px 30px rgba(0,0,0,0.35);user-select:none;";
  hud.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;cursor:move;" id="fml-drag"><strong style="font-size:13px;color:#34d399;">FlappyML Bot</strong><button id="fml-close" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:16px;line-height:1;">&times;</button></div>'+
    '<div id="fml-stats" style="color:#cbd5e1;line-height:1.5;margin-bottom:10px;">Scanning game...</div>'+
    '<div style="display:flex;gap:6px;margin-bottom:8px;">'+
      '<button id="fml-toggle" style="flex:1;padding:6px 8px;border-radius:6px;border:none;background:#10b981;color:#052e16;font-weight:700;cursor:pointer;">Pause</button>'+
      '<button id="fml-pick" style="padding:6px 8px;border-radius:6px;border:1px solid #475569;background:#1e293b;color:#e2e8f0;cursor:pointer;">Pick</button>'+
    '</div>'+
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:6px;">'+
      '<span>Bias: <b id="fml-bias">0.00</b></span>'+
      '<div style="display:flex;gap:4px;">'+
        '<button id="fml-bminus" style="padding:2px 8px;border-radius:4px;border:1px solid #475569;background:#1e293b;color:#fff;cursor:pointer;">-</button>'+
        '<button id="fml-bplus" style="padding:2px 8px;border-radius:4px;border:1px solid #475569;background:#1e293b;color:#fff;cursor:pointer;">+</button>'+
      '</div>'+
    '</div>'+
    '<label style="display:flex;align-items:center;gap:6px;cursor:pointer;color:#94a3b8;"><input id="fml-vis" type="checkbox" checked/> Vision Overlay</label>'+
    '<label style="display:flex;align-items:center;gap:6px;cursor:pointer;color:#94a3b8;margin-top:4px;"><input id="fml-tune" type="checkbox" checked/> Auto-Tune Physics</label>'+
    '<label style="display:flex;align-items:center;gap:6px;cursor:pointer;color:#94a3b8;margin-top:4px;"><input id="fml-restart" type="checkbox" checked/> Auto-Start / Retry</label>';
  document.body.appendChild(hud);

  var dragEl=hud.querySelector("#fml-drag"),dragging=false,dx=0,dy=0;
  dragEl.addEventListener("mousedown",function(e){dragging=true;var r=hud.getBoundingClientRect();dx=e.clientX-r.left;dy=e.clientY-r.top;});
  window.addEventListener("mousemove",function(e){if(!dragging)return;hud.style.left=(e.clientX-dx)+"px";hud.style.top=(e.clientY-dy)+"px";hud.style.right="auto";});
  window.addEventListener("mouseup",function(){dragging=false;});

  var statsEl=hud.querySelector("#fml-stats");
  var toggleBtn=hud.querySelector("#fml-toggle");
  var biasEl=hud.querySelector("#fml-bias");
  biasEl.textContent=state.biasOffset.toFixed(2);

  toggleBtn.onclick=function(){
    state.running=!state.running;
    toggleBtn.textContent=state.running?"Pause":"Start";
    toggleBtn.style.background=state.running?"#10b981":"#f59e0b";
  };
  hud.querySelector("#fml-vis").onchange=function(e){state.showVision=e.target.checked;if(!state.showVision)ovCtx.clearRect(0,0,overlay.width,overlay.height);};
  hud.querySelector("#fml-tune").onchange=function(e){state.autoTune=e.target.checked;};
  hud.querySelector("#fml-restart").onchange=function(e){state.autoRestart=e.target.checked;};
  hud.querySelector("#fml-bminus").onclick=function(){state.biasOffset=Number((state.biasOffset-0.02).toFixed(2));localStorage.setItem(STORAGE_KEY,state.biasOffset);biasEl.textContent=state.biasOffset.toFixed(2);};
  hud.querySelector("#fml-bplus").onclick=function(){state.biasOffset=Number((state.biasOffset+0.02).toFixed(2));localStorage.setItem(STORAGE_KEY,state.biasOffset);biasEl.textContent=state.biasOffset.toFixed(2);};
  hud.querySelector("#fml-pick").onclick=function(){
    statsEl.textContent="Click any game canvas...";
    var handler=function(ev){
      ev.preventDefault();ev.stopPropagation();
      if(ev.target&&ev.target.tagName==="CANVAS"){state.targetCanvas=ev.target;}
      document.removeEventListener("click",handler,true);
    };
    document.addEventListener("click",handler,true);
  };

  window.__flappyMLBotDestroy=function(){
    cancelAnimationFrame(state.rafId);
    hud.remove();
    overlay.remove();
    delete window.__flappyMLBotDestroy;
  };
  hud.querySelector("#fml-close").onclick=window.__flappyMLBotDestroy;

  function syncOverlay(rect){
    if(!state.showVision)return;
    overlay.style.left=rect.left+"px";
    overlay.style.top=rect.top+"px";
    overlay.style.width=rect.width+"px";
    overlay.style.height=rect.height+"px";
    var w=Math.max(1,Math.round(rect.width)),h=Math.max(1,Math.round(rect.height));
    if(overlay.width!==w)overlay.width=w;
    if(overlay.height!==h)overlay.height=h;
  }

  function drawOverlay(birdX,birdY,pipeX,gTop,gBot,out,playRatio){
    if(!state.showVision||!ovCtx)return;
    ovCtx.clearRect(0,0,overlay.width,overlay.height);
    var bx=birdX*overlay.width,by=birdY*overlay.height*playRatio;
    var px=pipeX*overlay.width,gt=gTop*overlay.height*playRatio,gb=gBot*overlay.height*playRatio;
    ovCtx.strokeStyle=out>0.5?"#10b981":"#f59e0b";
    ovCtx.lineWidth=2;
    ovCtx.strokeRect(bx-15,by-15,30,30);
    ovCtx.strokeStyle="#38bdf8";
    ovCtx.strokeRect(px,gt,48,Math.max(16,gb-gt));
    ovCtx.beginPath();ovCtx.moveTo(bx,by);ovCtx.lineTo(px,(gt+gb)/2);ovCtx.stroke();
  }

  function stepSvgStage(stage,now,dt){
    var svg=stage.querySelector(".flappy-svg")||stage.querySelector("svg");
    var birdEl=stage.querySelector(".flappy-bird-sprite")||stage.querySelector("img");
    if(!svg||!birdEl)return false;

    var rect=stage.getBoundingClientRect();
    if(rect.width<50||rect.height<50)return false;
    syncOverlay(rect);

    var vb=(svg.getAttribute("viewBox")||"").trim().split(/\\s+/);
    var vbW=vb.length===4?parseFloat(vb[2]):rect.width;
    var vbH=vb.length===4?parseFloat(vb[3]):rect.height;
    var playRatio=0.86;
    var playH=vbH*playRatio;
    var birdXNorm=0.30;
    var birdTop=parseFloat(birdEl.style.top);
    if(isNaN(birdTop)){
      var br=birdEl.getBoundingClientRect();
      birdTop=(br.top+br.height/2-rect.top)*(vbH/rect.height);
    }
    var birdY=Math.max(0,Math.min(1.05,birdTop/playH));

    // Check Ready / Game Over banner
    var banner=stage.querySelector(".flappy-banner");
    if(banner){
      var txt=(banner.textContent||"").toLowerCase();
      var isDead=banner.classList.contains("flappy-banner--over")||txt.indexOf("over")!==-1;
      if(isDead&&!state.wasBannerVisible&&state.autoTune){
        if(state.prevBirdY<state.lastGapCenter-0.04)state.biasOffset-=0.02;
        else if(state.prevBirdY>state.lastGapCenter+0.04)state.biasOffset+=0.02;
        state.biasOffset=Math.max(-0.25,Math.min(0.25,Number(state.biasOffset.toFixed(2))));
        localStorage.setItem(STORAGE_KEY,state.biasOffset);
        biasEl.textContent=state.biasOffset.toFixed(2);
      }
      state.wasBannerVisible=true;
      state.prevBirdY=birdY;
      state.smoothVy=0;
      if(state.running&&state.autoRestart&&txt.indexOf("saving")===-1&&(now-state.lastRestartAt>1400)){
        state.lastRestartAt=now;
        if(isDead)state.episodes++;
        triggerFlap(stage,true);
      }
      statsEl.innerHTML="Engine: <b>SVG</b> | "+(isDead?"Game Over":"Ready")+"<br>Ep: "+state.episodes+" | Flaps: "+state.flaps;
      if(ovCtx)ovCtx.clearRect(0,0,overlay.width,overlay.height);
      return true;
    }
    state.wasBannerVisible=false;

    var rawVy=((birdY-state.prevBirdY)/Math.max(0.008,dt))/2.0;
    state.smoothVy=state.smoothVy*0.35+rawVy*0.65;
    state.prevBirdY=birdY;

    // Parse pipe <g> groups inside SVG
    var groups=svg.querySelectorAll("g");
    var birdVbX=vbW*birdXNorm;
    var bestPipe=null;
    for(var i=0;i<groups.length;i++){
      var rects=groups[i].querySelectorAll("rect");
      if(rects.length<3)continue;
      var px=parseFloat(rects[0].getAttribute("x")||"0");
      var pw=parseFloat(rects[0].getAttribute("width")||"40");
      if(px+pw>=birdVbX-vbW*0.028){
        if(!bestPipe||px<bestPipe.px){
          var gt=parseFloat(rects[0].getAttribute("height")||"100")/playH;
          var gb=parseFloat(rects[2].getAttribute("y")||"200")/playH;
          bestPipe={px:px,pw:pw,pXNorm:px/vbW,gt:gt,gb:gb};
        }
      }
    }

    var pXNorm=0.85,gTop=0.38,gBot=0.62;
    if(bestPipe){
      pXNorm=bestPipe.pXNorm;
      gTop=bestPipe.gt;
      gBot=bestPipe.gb;
      state.lastPipeX=pXNorm;
      state.lastGapCenter=(gTop+gBot)/2;
      state.lastGapBottom=gBot;
    }else{
      pXNorm=state.lastPipeX;
      gTop=state.lastGapCenter-0.12;
      gBot=state.lastGapBottom;
    }

    var gMid=(gTop+gBot)/2;
    var dist=bestPipe?Math.max(0,(bestPipe.px+bestPipe.pw-birdVbX)/vbW):0.85;
    var out=predict([birdY,Math.max(-1,Math.min(1,state.smoothVy)),Math.max(0,Math.min(1,dist)),birdY-gMid+state.biasOffset,gBot-birdY-state.biasOffset]);
    state.lastOutput=out;

    if(state.cooldown>0)state.cooldown--;
    if(state.running&&out>0.5&&state.cooldown<=0){
      triggerFlap(stage,true);
      state.flaps++;
      state.cooldown=6;
    }

    drawOverlay(birdXNorm,birdY,pXNorm,gTop,gBot,out,playRatio);
    var scoreEl=svg.querySelector(".flappy-svg-score");
    var sc=scoreEl?scoreEl.textContent:"0";
    statsEl.innerHTML="Engine: <b>SVG</b> | Score: <b>"+sc+"</b><br>Out: "+(out*100).toFixed(0)+"% | Ep: "+state.episodes;
    return true;
  }

  function loop(now){
    state.rafId=requestAnimationFrame(loop);
    var dt=(now-state.lastTime)/1000;
    state.lastTime=now;

    // 1. Check for SVG/DOM Flappy Bird stage (e.g. quest.feather.games)
    var svgStage=document.querySelector(".flappy-stage");
    if(svgStage&&stepSvgStage(svgStage,now,dt)){
      return;
    }

    // 2. Fallback to HTML5 <canvas> Pixel-Vision Scanner
    if(!state.targetCanvas||!state.targetCanvas.isConnected){
      state.targetCanvas=findLargestCanvas();
    }
    var canvas=state.targetCanvas;
    if(!canvas){
      statsEl.textContent=location.hostname.indexOf("feather")!==-1
        ? "Open Flappy game to start bot..."
        : "No game canvas/SVG found. Click Pick.";
      return;
    }

    var rect=canvas.getBoundingClientRect();
    syncOverlay(rect);

    try{
      offCtx.drawImage(canvas,0,0,scanW,scanH);
      var img=offCtx.getImageData(0,0,scanW,scanH).data;
      var fHash=0;
      for(var k=0;k<img.length;k+=256)fHash=(fHash+img[k])|0;
      if(fHash===state.lastFrameHash){
        state.stallFrames++;
        if(state.running&&state.autoRestart&&state.stallFrames===42){
          if(state.autoTune){
            if(state.prevBirdY<state.lastGapCenter-0.05)state.biasOffset-=0.02;
            else if(state.prevBirdY>state.lastGapCenter+0.05)state.biasOffset+=0.02;
            state.biasOffset=Math.max(-0.25,Math.min(0.25,Number(state.biasOffset.toFixed(2))));
            localStorage.setItem(STORAGE_KEY,state.biasOffset);
            biasEl.textContent=state.biasOffset.toFixed(2);
          }
          state.episodes++;
          triggerFlap(canvas);
        }
      }else{
        state.stallFrames=0;
        state.lastFrameHash=fHash;
      }

      var rS=0,gS=0,bS=0,cnt=0;
      for(var y=3;y<=6;y++){
        for(var x=8;x<scanW-8;x+=6){
          var idx=(y*scanW+x)*4;
          rS+=img[idx];gS+=img[idx+1];bS+=img[idx+2];cnt++;
        }
      }
      var sR=rS/cnt,sG=gS/cnt,sB=bS/cnt;
      var pBottom=Math.floor(scanH*0.87);

      var bSumY=0,bSumX=0,bPx=0;
      for(var x=Math.floor(scanW*0.16);x<=Math.floor(scanW*0.30);x++){
        for(var y=6;y<pBottom;y++){
          var id=(y*scanW+x)*4;
          if(Math.abs(img[id]-sR)+Math.abs(img[id+1]-sG)+Math.abs(img[id+2]-sB)>68){
            bSumY+=y;bSumX+=x;bPx++;
          }
        }
      }
      var birdY=state.prevBirdY,birdX=0.22;
      if(bPx>4&&bPx<220){birdY=(bSumY/bPx)/pBottom;birdX=(bSumX/bPx)/scanW;}
      var rawVy=(birdY-state.prevBirdY)*18;
      state.smoothVy=state.smoothVy*0.45+rawVy*0.55;
      state.prevBirdY=birdY;

      var pX=-1,gTop=state.lastGapCenter-0.12,gBot=state.lastGapCenter+0.12;
      for(var x=Math.floor(scanW*0.24);x<scanW-4;x++){
        var nonSky=0;
        for(var y=4;y<pBottom;y++){
          var id=(y*scanW+x)*4;
          if(Math.abs(img[id]-sR)+Math.abs(img[id+1]-sG)+Math.abs(img[id+2]-sB)>68)nonSky++;
        }
        if(nonSky>pBottom*0.38){
          var bgS=-1,bgL=0,cS=-1,cL=0;
          for(var y=4;y<pBottom;y++){
            var id=(y*scanW+x)*4;
            var obs=Math.abs(img[id]-sR)+Math.abs(img[id+1]-sG)+Math.abs(img[id+2]-sB)>68;
            if(!obs){if(cS===-1)cS=y;cL++;}
            else{if(cL>bgL){bgL=cL;bgS=cS;}cS=-1;cL=0;}
          }
          if(cL>bgL){bgL=cL;bgS=cS;}
          if(bgL>=pBottom*0.14&&bgL<=pBottom*0.45){
            pX=x/scanW;gTop=bgS/pBottom;gBot=(bgS+bgL)/pBottom;break;
          }
        }
      }
      if(pX!==-1){
        state.lastPipeX=pX;state.lastGapCenter=(gTop+gBot)/2;state.lastGapBottom=gBot;
      }else{
        pX=state.lastPipeX;gTop=state.lastGapCenter-0.12;gBot=state.lastGapBottom;
      }
      var gMid=(gTop+gBot)/2;
      var dist=Math.max(0,pX+0.08-birdX);
      var out=predict([birdY,Math.max(-1,Math.min(1,state.smoothVy)),Math.max(0,Math.min(1,dist)),birdY-gMid+state.biasOffset,gBot-birdY-state.biasOffset]);
      state.lastOutput=out;

      if(state.cooldown>0)state.cooldown--;
      if(state.running&&out>0.5&&state.cooldown<=0){
        triggerFlap(canvas);
        state.flaps++;
        state.cooldown=6;
      }

      drawOverlay(birdX,birdY,pX,gTop,gBot,out,0.87);
      statsEl.innerHTML="Engine: <b>Canvas</b> | Ep: "+state.episodes+"<br>Out: "+(out*100).toFixed(0)+"% | Flaps: "+state.flaps;
    }catch(err){
      statsEl.textContent="Cross-origin canvas blocked. Run inside game frame.";
    }
  }
  state.rafId=requestAnimationFrame(loop);
})();`;

  const minified = rawIife.replace(/\n\s*/g, '');
  const bookmarkletUri = `javascript:${encodeURIComponent(minified)}`;

  const userscript = `// ==UserScript==
// @name         FlappyML Universal Auto-Play Bot
// @namespace    https://flappyml.studio/
// @version      1.1.0
// @description  Autonomous neuroevolution Flappy Bird bot (SVG/DOM + Canvas Pixel Vision)
// @match        *://quest.feather.games/*
// @match        *://*/*flappy*
// @match        *://flappybird.io/*
// @match        *://*.poki.com/*
// @match        *://*.crazygames.com/*
// @grant        none
// ==/UserScript==

${rawIife}`;

  const htmlEmbedSnippet = `<!-- Paste before </body> on any webpage running a Flappy Bird game -->
<script>
${rawIife}
</script>`;

  return {
    consoleScript: rawIife,
    bookmarkletUri,
    userscript,
    htmlEmbedSnippet,
  };
}
