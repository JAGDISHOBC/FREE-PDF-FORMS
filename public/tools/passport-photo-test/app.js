(() => {
"use strict";

const MAX_FILE=10*1024*1024;
const $=id=>document.getElementById(id);

const fileInput=$("fileInput"), chooseButton=$("chooseButton"), uploadArea=$("uploadArea");
const fileName=$("fileName"), editor=$("editor"), preview=$("previewImage");
const status=$("status"), result=$("result"), resultInfo=$("resultInfo"), downloadButton=$("downloadButton");
const targetKB=$("targetKB"), photoSize=$("photoSize"), customSize=$("customSize");
const customW=$("customW"), customH=$("customH");
const advanced=$("advanced"), advancedToggle=$("advancedToggle"), advancedArrow=$("advancedArrow");
const undoButton=$("undoButton"), redoButton=$("redoButton"), resetButton=$("resetButton");
const rotateLeft=$("rotateLeft"), rotateRight=$("rotateRight"), autoAdjust=$("autoAdjust");
const aiEnhance=$("aiEnhance"), aiWhite=$("aiWhite"), aiFormal=$("aiFormal"), aiSuit=$("aiSuit"), aiTie=$("aiTie"), aiLimit=$("aiLimit");
const brightness=$("brightness"), contrast=$("contrast"), saturation=$("saturation"), sharpness=$("sharpness");
const brightnessValue=$("brightnessValue"), contrastValue=$("contrastValue"), saturationValue=$("saturationValue"), sharpnessValue=$("sharpnessValue");
const resetAdvanced=$("resetAdvanced"), processButton=$("processButton"), quickProcess=$("quickProcess"), chooseAnother=$("chooseAnother");
const cropZoom=$("cropZoom"), cropX=$("cropX"), cropY=$("cropY"), cropZoomValue=$("cropZoomValue"), cropXValue=$("cropXValue"), cropYValue=$("cropYValue"), autoFaceCrop=$("autoFaceCrop"), resetCrop=$("resetCrop"), hdQuality=$("hdQuality");

let sourceFile=null, sourceUrl=null, workUrl=null, downloadUrl=null, busy=false;
let state={rotate:0,brightness:0,contrast:0,saturation:0,sharpness:0,cropZoom:100,cropX:0,cropY:0,hdQuality:false};
let history=[], future=[];

function setStatus(t,type="working"){status.textContent=t;status.className="status show "+type}
function clearStatus(){status.textContent="";status.className="status"}
function bytesText(n){if(n<1024)return n+" B";if(n<1048576)return(n/1024).toFixed(1)+" KB";return(n/1048576).toFixed(2)+" MB"}
function cloneState(){return {...state}}
function same(a,b){return JSON.stringify(a)===JSON.stringify(b)}
function pushHistory(){
  const s=cloneState();
  if(!history.length||!same(history[history.length-1],s)) history.push(s);
  future=[];
  updateHistoryButtons();
}
function applyState(s){
  state={...s};
  brightness.value=state.brightness;contrast.value=state.contrast;saturation.value=state.saturation;sharpness.value=state.sharpness;
  cropZoom.value=state.cropZoom;cropX.value=state.cropX;cropY.value=state.cropY;hdQuality.checked=!!state.hdQuality;
  brightnessValue.textContent=state.brightness;contrastValue.textContent=state.contrast;saturationValue.textContent=state.saturation;sharpnessValue.textContent=state.sharpness;
  cropZoomValue.textContent=state.cropZoom+"%";cropXValue.textContent=state.cropX;cropYValue.textContent=state.cropY;
  renderPreview();
}
function updateHistoryButtons(){undoButton.disabled=history.length<=1||busy;redoButton.disabled=future.length===0||busy}
function renderPreview(){
  if(!sourceUrl)return;
  const filters=[
    `brightness(${100+state.brightness}%)`,
    `contrast(${100+state.contrast}%)`,
    `saturate(${100+state.saturation}%)`
  ].join(" ");
  preview.src=sourceUrl;
  preview.style.filter=filters;
  preview.style.transform=`rotate(${state.rotate}deg) scale(${1 + (Number(state.cropZoom)-100)/350})`;
  preview.style.objectFit="cover";
  preview.style.objectPosition=`${50 + Number(state.cropX)/2}% ${50 + Number(state.cropY)/2}%`;
}
function loadFile(file){
  clearStatus();result.classList.remove("show");
  if(!file)return;
  if(file.size>MAX_FILE){setStatus("Maximum photo size is 10 MB.","error");return}
  if(!/^image\/(jpeg|png|webp)$/.test(file.type)&&!/\.(jpe?g|png|webp)$/i.test(file.name)){setStatus("Please select a JPG, PNG or WebP photo.","error");return}
  if(sourceUrl)URL.revokeObjectURL(sourceUrl);
  sourceFile=file;sourceUrl=URL.createObjectURL(file);
  fileName.textContent=`Selected: ${file.name} • ${bytesText(file.size)}`;
  editor.classList.add("show");
  state={rotate:0,brightness:0,contrast:0,saturation:0,sharpness:0,cropZoom:100,cropX:0,cropY:0,hdQuality:false};
  history=[cloneState()];future=[];advanced.classList.remove("open");advancedArrow.textContent="⌄";
  applyState(state);updateHistoryButtons();checkAIStatus();
}
chooseButton.onclick=()=>fileInput.click();
fileInput.onchange=()=>{loadFile(fileInput.files[0]);fileInput.value=""};
uploadArea.addEventListener("dragover",e=>{e.preventDefault();uploadArea.classList.add("drag")});
uploadArea.addEventListener("dragleave",()=>uploadArea.classList.remove("drag"));
uploadArea.addEventListener("drop",e=>{e.preventDefault();uploadArea.classList.remove("drag");loadFile(e.dataTransfer.files[0])});

undoButton.onclick=()=>{if(history.length<=1||busy)return;future.unshift(history.pop());applyState(history[history.length-1]);updateHistoryButtons()};
redoButton.onclick=()=>{if(!future.length||busy)return;const s=future.shift();history.push(s);applyState(s);updateHistoryButtons()};

function changeState(fn){
  if(!sourceFile||busy)return;
  pushHistory();
  fn();
  applyState(state);
  history[history.length-1]=cloneState();
  updateHistoryButtons();
}
rotateLeft.onclick=()=>changeState(()=>state.rotate-=90);
rotateRight.onclick=()=>changeState(()=>state.rotate+=90);
autoAdjust.onclick=()=>changeState(()=>{state.brightness=5;state.contrast=8;state.saturation=3;});
[brightness,contrast,saturation,sharpness].forEach((el,i)=>{
  el.addEventListener("input",()=>{
    if(!sourceFile||busy)return;
    state[["brightness","contrast","saturation","sharpness"][i]]=Number(el.value);
    brightnessValue.textContent=state.brightness;contrastValue.textContent=state.contrast;saturationValue.textContent=state.saturation;sharpnessValue.textContent=state.sharpness;
    renderPreview();
  });
  el.addEventListener("change",()=>{pushHistory();history[history.length-1]=cloneState();});
});

resetAdvanced.onclick=()=>{
  if(busy)return;
  state.brightness=0;state.contrast=0;state.saturation=0;state.sharpness=0;
  pushHistory();applyState(state);setStatus("Advanced settings reset.","success");
};
resetButton.onclick=()=>{
  if(busy||!sourceFile)return;
  state={rotate:0,brightness:0,contrast:0,saturation:0,sharpness:0,cropZoom:100,cropX:0,cropY:0,hdQuality:false};
  history=[cloneState()];future=[];applyState(state);result.classList.remove("show");clearStatus();
};
advancedToggle.onclick=()=>{advanced.classList.toggle("open");advancedArrow.textContent=advanced.classList.contains("open")?"⌃":"⌄"};

photoSize.onchange=()=>{customSize.style.display=photoSize.value==="custom"?"grid":"none"};

function getSizePx(){
  let w,h;
  if(photoSize.value==="2x2"){w=600;h=600}
  else if(photoSize.value==="40x50"){w=472;h=591}
  else if(photoSize.value==="custom"){
    const mmW=Math.max(10,Math.min(200,Number(customW.value)||35));
    const mmH=Math.max(10,Math.min(200,Number(customH.value)||45));
    w=Math.round(mmW/25.4*300);h=Math.round(mmH/25.4*300);
  } else {w=413;h=531}
  if(state.hdQuality){w*=2;h*=2}
  return[w,h];
}
async function detectFaceCenter(img){
  try{
    if(!("FaceDetector" in window)) return null;
    const detector=new FaceDetector({fastMode:true,maxDetectedFaces:1});
    const faces=await detector.detect(img);
    if(!faces.length)return null;
    const b=faces[0].boundingBox;
    return {x:b.x+b.width/2,y:b.y+b.height*0.48};
  }catch{return null}
}
async function drawProcessedCanvas(img,w,h){
  const canvas=document.createElement("canvas");canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext("2d",{willReadFrequently:true});
  ctx.fillStyle="#fff";ctx.fillRect(0,0,w,h);
  ctx.save();
  ctx.translate(w/2,h/2);ctx.rotate(state.rotate*Math.PI/180);
  const iw=img.naturalWidth,ih=img.naturalHeight;
  const ratio=w/h,ir=iw/ih;
  let centerX=iw/2,centerY=ih/2;
  const face=await detectFaceCenter(img);
  if(face){centerX=face.x;centerY=face.y}
  let sw,sh;
  if(ir>ratio){sh=ih;sw=ih*ratio}else{sw=iw;sh=iw/ratio}
  const zoom=Math.max(1,Number(state.cropZoom||100)/100);
  sw=Math.max(20,sw/zoom);sh=Math.max(20,sh/zoom);
  const availableX=Math.max(0,(iw-sw)/2);
  const availableY=Math.max(0,(ih-sh)/2);
  centerX += (Number(state.cropX||0)/100)*availableX;
  centerY += (Number(state.cropY||0)/100)*availableY;
  centerX=Math.max(sw/2,Math.min(iw-sw/2,centerX));
  centerY=Math.max(sh/2,Math.min(ih-sh/2,centerY));
  ctx.filter=`brightness(${100+state.brightness}%) contrast(${100+state.contrast}%) saturate(${100+state.saturation}%)`;
  ctx.drawImage(img,centerX-sw/2,centerY-sh/2,sw,sh,-w/2,-h/2,w,h);
  ctx.restore();
  if(state.sharpness>0){
    // Conservative unsharp-like overlay. Avoids creating a visibly artificial face.
    ctx.globalAlpha=Math.min(.18,state.sharpness/550);
    ctx.globalCompositeOperation="overlay";
    ctx.drawImage(canvas,0,0);
    ctx.globalAlpha=1;ctx.globalCompositeOperation="source-over";
  }
  return canvas;
}
function loadImage(url){return new Promise((res,rej)=>{const img=new Image();img.onload=()=>res(img);img.onerror=()=>rej(new Error("Could not read the photo."));img.src=url})}

async function canvasToTarget(canvas,target){
  const maxAttempts=14;
  if(!target)return new Promise((res,rej)=>canvas.toBlob(b=>b?res(b):rej(new Error("Could not create JPG.")),"image/jpeg",.92));
  let current=canvas;
  for(let scale=1,attempt=0;attempt<maxAttempts;attempt++){
    const qualities=[.92,.85,.78,.72,.66,.60,.54,.48,.42,.36,.30,.24];
    for(const q of qualities){
      const blob=await new Promise(r=>current.toBlob(r,"image/jpeg",q));
      if(blob&&blob.size<=target)return blob;
    }
    scale*=.86;
    if(scale<.25)break;
    const c=document.createElement("canvas");c.width=Math.max(80,Math.floor(canvas.width*scale));c.height=Math.max(80,Math.floor(canvas.height*scale));
    c.getContext("2d").drawImage(canvas,0,0,c.width,c.height);current=c;
  }
  // If target is extremely small, return the smallest result found; never exceed target intentionally.
  const final=await new Promise(r=>current.toBlob(r,"image/jpeg",.18));
  if(final&&final.size<=target)return final;
  throw new Error("This target size is too small for a usable passport photo. Please use a larger KB value.");
}

[cropZoom,cropX,cropY].forEach((el,i)=>{
  el.addEventListener("input",()=>{
    if(!sourceFile||busy)return;
    state[["cropZoom","cropX","cropY"][i]]=Number(el.value);
    cropZoomValue.textContent=state.cropZoom+"%";cropXValue.textContent=state.cropX;cropYValue.textContent=state.cropY;
    renderPreview();
  });
  el.addEventListener("change",()=>{pushHistory();history[history.length-1]=cloneState()});
});
autoFaceCrop.onclick=()=>{
  if(!sourceFile||busy)return;
  changeState(()=>{state.cropZoom=100;state.cropX=0;state.cropY=0});
  setStatus("Auto face crop restored. The tool will center the detected face when supported.","success");
};
resetCrop.onclick=()=>{
  if(!sourceFile||busy)return;
  changeState(()=>{state.cropZoom=100;state.cropX=0;state.cropY=0});
  setStatus("Crop reset to default.","success");
};
hdQuality.onchange=()=>{
  if(!sourceFile||busy)return;
  changeState(()=>{state.hdQuality=hdQuality.checked});
  setStatus(state.hdQuality?"HD Quality enabled — output resolution is doubled.":"HD Quality disabled.","success");
};

async function createPhoto(){
  if(!sourceFile||busy)return;
  const target=targetKB.value?Math.max(5,Number(targetKB.value))*1024:null;
  if(targetKB.value&&(Number(targetKB.value)<5||Number(targetKB.value)>2048)){setStatus("Target size must be between 5 KB and 2048 KB.","error");return}
  busy=true;updateHistoryButtons();quickProcess.disabled=true;processButton.disabled=true;setStatus("Creating passport photo…","working");
  try{
    const img=await loadImage(sourceUrl);
    const [w,h]=getSizePx();
    const canvas=await drawProcessedCanvas(img,w,h);
    const blob=await canvasToTarget(canvas,target);
    if(target&&blob.size>target)throw new Error("Could not meet the selected maximum file size.");
    if(downloadUrl)URL.revokeObjectURL(downloadUrl);
    downloadUrl=URL.createObjectURL(blob);
    downloadButton.href=downloadUrl;downloadButton.download="passport-photo.jpg";
    resultInfo.textContent=`${w} × ${h} px • Final size: ${bytesText(blob.size)}${target?` • Target: ${Math.floor(target/1024)} KB (never above target)`: ""}`;
    result.classList.add("show");setStatus("Passport photo created successfully.","success");
  }catch(err){console.error(err);setStatus(err.message||"Could not create the passport photo.","error")}
  finally{busy=false;quickProcess.disabled=false;processButton.disabled=false;updateHistoryButtons()}
}
quickProcess.onclick=createPhoto;processButton.onclick=createPhoto;

async function aiRequest(mode,dress){
  if(!sourceFile||busy)return;
  busy=true;[aiEnhance,aiWhite,aiFormal,aiSuit,aiTie,quickProcess,processButton].forEach(b=>b.disabled=true);
  setStatus(mode==="dress"?"Applying AI formal dress…":"Enhancing photo with AI…","working");
  try{
    // Downscale before upload so the Workers AI model receives a reference under 512x512.
    const img=await loadImage(sourceUrl);
    const c=document.createElement("canvas");
    const s=Math.min(1,500/Math.max(img.naturalWidth,img.naturalHeight));
    c.width=Math.max(1,Math.round(img.naturalWidth*s));c.height=Math.max(1,Math.round(img.naturalHeight*s));
    c.getContext("2d").drawImage(img,0,0,c.width,c.height);
    const blob=await new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(new Error("Could not prepare image.")),"image/jpeg",.88));
    const fd=new FormData();fd.append("image",blob,"passport.jpg");fd.append("mode",mode);if(dress)fd.append("dress",dress);
    const resp=await fetch("/api/ai/passport",{method:"POST",body:fd});
    const type=resp.headers.get("content-type")||"";
    if(!resp.ok){
      let msg="AI request failed.";
      try{const data=await resp.json();msg=data.error||msg}catch{}
      throw new Error(msg);
    }
    if(!type.startsWith("image/"))throw new Error("AI returned an invalid image.");
    const resultBlob=await resp.blob();
    if(workUrl)URL.revokeObjectURL(workUrl);
    workUrl=URL.createObjectURL(resultBlob);
    if(sourceUrl)URL.revokeObjectURL(sourceUrl);
    sourceUrl=workUrl;
    sourceFile=new File([resultBlob],"ai-passport.png",{type:resultBlob.type});
    state={rotate:0,brightness:0,contrast:0,saturation:0,sharpness:0,cropZoom:100,cropX:0,cropY:0,hdQuality:false};
    history=[cloneState()];future=[];applyState(state);
    setStatus("AI result applied. You can undo it or edit further.","success");
    checkAIStatus();
  }catch(err){console.error(err);setStatus(err.message||"AI editing failed. Normal editing is still available.","error")}
  finally{busy=false;[aiEnhance,aiWhite,aiFormal,aiSuit,aiTie,quickProcess,processButton].forEach(b=>b.disabled=false);updateHistoryButtons()}
}
aiEnhance.onclick=()=>aiRequest("enhance");
aiWhite.onclick=()=>aiRequest("dress","white-shirt");
aiFormal.onclick=()=>aiRequest("dress","formal-shirt");
aiSuit.onclick=()=>aiRequest("dress","suit");
aiTie.onclick=()=>aiRequest("dress","suit-tie");

async function checkAIStatus(){
  if(!sourceFile){aiLimit.textContent="";return}
  try{
    const r=await fetch("/api/ai/status");
    const d=await r.json();
    if(d.success){
      aiLimit.textContent=d.aiAvailable?`AI requests remaining for this visitor: ${d.remaining} / ${d.dailyUserLimit}`:"Today's free AI limit has been reached. AI tools are temporarily unavailable.";
      [aiEnhance,aiWhite,aiFormal,aiSuit,aiTie].forEach(b=>b.disabled=!d.aiAvailable);
    }
  }catch{aiLimit.textContent="AI availability could not be checked. Normal mode is available."}
}
chooseAnother.onclick=()=>{
  if(busy)return;
  if(sourceUrl)URL.revokeObjectURL(sourceUrl);sourceUrl=null;
  if(workUrl&&workUrl!==sourceUrl)URL.revokeObjectURL(workUrl);workUrl=null;
  if(downloadUrl)URL.revokeObjectURL(downloadUrl);downloadUrl=null;
  sourceFile=null;fileInput.value="";fileName.textContent="";editor.classList.remove("show");result.classList.remove("show");clearStatus();
  history=[];future=[];updateHistoryButtons();
};
window.addEventListener("beforeunload",()=>{if(sourceUrl)URL.revokeObjectURL(sourceUrl);if(workUrl)URL.revokeObjectURL(workUrl);if(downloadUrl)URL.revokeObjectURL(downloadUrl)});
})();