(() => {
"use strict";

const MAX_FILES = 30;
const MAX_TOTAL_BYTES = 100 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg","image/png"]);

const fileInput = document.getElementById("fileInput");
const chooseButton = document.getElementById("chooseButton");
const uploadArea = document.getElementById("uploadArea");
const fileCount = document.getElementById("fileCount");
const fileList = document.getElementById("fileList");
const pageSize = document.getElementById("pageSize");
const orientation = document.getElementById("orientation");
const fit = document.getElementById("fit");
const margin = document.getElementById("margin");
const convertButton = document.getElementById("convertButton");
const anotherButton = document.getElementById("anotherButton");
const status = document.getElementById("status");
const result = document.getElementById("result");
const resultInfo = document.getElementById("resultInfo");
const fileNameInput = document.getElementById("fileName");
const downloadButton = document.getElementById("downloadButton");

let items = [];
let busy = false;
let downloadUrl = null;
let draggedIndex = -1;

function bytesText(n){
  if(n<1024)return n+" B";
  if(n<1024*1024)return (n/1024).toFixed(1)+" KB";
  return (n/1024/1024).toFixed(2)+" MB";
}
function setStatus(text,type="working"){
  status.textContent=text;
  status.className="status show "+type;
}
function clearStatus(){status.textContent="";status.className="status"}
function totalBytes(){return items.reduce((s,x)=>s+x.file.size,0)}
function updateButtons(){
  convertButton.disabled=busy||items.length===0;
  fileCount.hidden=items.length===0;
  fileCount.textContent=items.length?`${items.length} image${items.length===1?"":"s"} selected • ${bytesText(totalBytes())}`:"";
}
function safeName(name){
  const clean=name.trim().replace(/[<>:"/\\|?*\x00-\x1F]/g,"-").replace(/\s+/g," ");
  if(!clean)return"images-to-pdf.pdf";
  return (clean.toLowerCase().endsWith(".pdf")?clean:clean+".pdf").slice(0,120);
}

function renderList(){
  fileList.innerHTML="";
  items.forEach((item,index)=>{
    const row=document.createElement("div");
    row.className="item"; row.draggable=!busy; row.dataset.index=String(index);

    const img=document.createElement("img");
    img.className="thumb"; img.src=item.preview; img.alt="";

    const meta=document.createElement("div"); meta.className="meta";
    const name=document.createElement("div"); name.className="name"; name.title=item.file.name;
    name.textContent=`${index+1}. ${item.file.name}`;
    const size=document.createElement("div"); size.className="size"; size.textContent=bytesText(item.file.size);
    meta.append(name,size);

    const actions=document.createElement("div"); actions.className="item-actions";
    const up=document.createElement("button"); up.className="small"; up.type="button"; up.textContent="↑"; up.title="Move up"; up.disabled=index===0||busy;
    const down=document.createElement("button"); down.className="small"; down.type="button"; down.textContent="↓"; down.title="Move down"; down.disabled=index===items.length-1||busy;
    const remove=document.createElement("button"); remove.className="small remove"; remove.type="button"; remove.textContent="Remove"; remove.disabled=busy;
    up.onclick=()=>moveItem(index,index-1); down.onclick=()=>moveItem(index,index+1); remove.onclick=()=>removeItem(index);
    actions.append(up,down,remove); row.append(img,meta,actions);

    row.addEventListener("dragstart",()=>{draggedIndex=index;row.classList.add("dragging")});
    row.addEventListener("dragend",()=>{draggedIndex=-1;row.classList.remove("dragging")});
    row.addEventListener("dragover",e=>e.preventDefault());
    row.addEventListener("drop",e=>{e.preventDefault();const target=Number(row.dataset.index);if(draggedIndex>=0&&draggedIndex!==target)moveItem(draggedIndex,target)});
    fileList.appendChild(row);
  });
  updateButtons();
}
function moveItem(from,to){
  if(busy||from<0||to<0||from>=items.length||to>=items.length)return;
  const x=items.splice(from,1)[0];items.splice(to,0,x);renderList();result.classList.remove("show");clearStatus();
}
function removeItem(index){
  if(busy)return;
  URL.revokeObjectURL(items[index].preview);
  items.splice(index,1);renderList();result.classList.remove("show");clearStatus();
}
function addFiles(files){
  clearStatus();result.classList.remove("show");
  const incoming=Array.from(files||[]);if(!incoming.length)return;
  const room=MAX_FILES-items.length;
  if(room<=0){setStatus(`You can select up to ${MAX_FILES} images.`,"error");return}

  const accepted=[],rejected=[];
  for(const file of incoming.slice(0,room)){
    if(!ALLOWED.has(file.type)&&!/\.(jpe?g|png)$/i.test(file.name)){rejected.push(`${file.name}: not JPG/PNG`);continue}
    accepted.push({file,preview:URL.createObjectURL(file)});
  }
  if(incoming.length>room)rejected.push(`Only ${room} more image${room===1?"":"s"} can be added.`);
  const newTotal=totalBytes()+accepted.reduce((s,x)=>s+x.file.size,0);
  if(newTotal>MAX_TOTAL_BYTES){
    accepted.forEach(x=>URL.revokeObjectURL(x.preview));
    setStatus("The total image size must not exceed 100 MB.","error");return;
  }
  items.push(...accepted);renderList();
  if(rejected.length)setStatus(rejected.join(" • "),"error");
  else if(items.length)setStatus("Images ready. Check the order, then click Convert to PDF.","success");
}
chooseButton.onclick=()=>fileInput.click();
fileInput.onchange=()=>{addFiles(fileInput.files);fileInput.value=""};
uploadArea.addEventListener("dragover",e=>{e.preventDefault();uploadArea.classList.add("drag")});
uploadArea.addEventListener("dragleave",()=>uploadArea.classList.remove("drag"));
uploadArea.addEventListener("drop",e=>{e.preventDefault();uploadArea.classList.remove("drag");addFiles(e.dataTransfer.files)});
anotherButton.onclick=()=>{
  if(busy)return;
  items.forEach(x=>URL.revokeObjectURL(x.preview));items=[];fileInput.value="";
  fileList.innerHTML="";result.classList.remove("show");clearStatus();
  if(downloadUrl){URL.revokeObjectURL(downloadUrl);downloadUrl=null}
  downloadButton.removeAttribute("href");renderList();
};

function pagePoints(size){
  if(size==="a4")return[595.2756,841.8898];
  if(size==="a5")return[419.5276,595.2756];
  if(size==="letter")return[612,792];
  return null;
}
function orientedPage(size,mode,imgW,imgH){
  let [w,h]=pagePoints(size)||[imgW,imgH];
  if(mode==="landscape"&&h>w)[w,h]=[h,w];
  if(mode==="portrait"&&w>h)[w,h]=[h,w];
  if(mode==="auto"){
    const imageLandscape=imgW>imgH;
    if(imageLandscape&&h>w)[w,h]=[h,w];
    if(!imageLandscape&&w>h)[w,h]=[h,w];
  }
  return[w,h];
}
function getImageElement(file){
  return new Promise((resolve,reject)=>{
    const url=URL.createObjectURL(file);
    const img=new Image();
    img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};
    img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("Could not read image: "+file.name))};
    img.src=url;
  });
}
function addImagePage(doc,img,pw,ph,mode,marginPts){
  const m=Math.min(marginPts,Math.max(0,Math.min(pw,ph)/2-1));
  const areaW=Math.max(1,pw-2*m),areaH=Math.max(1,ph-2*m);
  let x,y,w,h;
  const iw=img.width,ih=img.height;

  if(mode==="original"){
    const scale=Math.min(1,areaW/iw,areaH/ih);
    w=iw*scale;h=ih*scale;x=(pw-w)/2;y=(ph-h)/2;
  }else if(mode==="cover"){
    const scale=Math.max(areaW/iw,areaH/ih);
    w=iw*scale;h=ih*scale;x=(pw-w)/2;y=(ph-h)/2;
  }else{
    const scale=Math.min(areaW/iw,areaH/ih);
    w=iw*scale;h=ih*scale;x=(pw-w)/2;y=(ph-h)/2;
  }
  return{x,y,w,h};
}

convertButton.onclick=async()=>{
  if(busy||!items.length)return;
  if(!window.PDFLib||!window.PDFLib.PDFDocument){setStatus("PDF engine could not be loaded. Please refresh and try again.","error");return}
  busy=true;updateButtons();result.classList.remove("show");setStatus("Creating PDF…","working");
  try{
    const {PDFDocument}=window.PDFLib;
    const doc=await PDFDocument.create();
    let pages=0;

    for(let i=0;i<items.length;i++){
      setStatus(`Adding image ${i+1} of ${items.length}…`,"working");
      const img=await getImageElement(items[i].file);
      const ps=pageSize.value;
      let [pw,ph]=ps==="original"?[img.width,img.height]:orientedPage(ps,orientation.value,img.width,img.height);

      const page=doc.addPage([pw,ph]);
      let embedded;
      if(items[i].file.type==="image/png"||/\.png$/i.test(items[i].file.name)){
        const bytes=new Uint8Array(await items[i].file.arrayBuffer());
        embedded=await doc.embedPng(bytes);
      }else{
        const bytes=new Uint8Array(await items[i].file.arrayBuffer());
        embedded=await doc.embedJpg(bytes);
      }

      const box=addImagePage(doc,img,pw,ph,fit.value,Number(margin.value));
      page.drawImage(embedded,{x:box.x,y:box.y,width:box.w,height:box.h});
      pages++;
    }

    setStatus("Finalizing PDF…","working");
    const output=await doc.save({useObjectStreams:true,addDefaultPage:false,updateMetadata:false});
    if(!output||!output.length)throw new Error("PDF was empty.");

    if(downloadUrl)URL.revokeObjectURL(downloadUrl);
    downloadUrl=URL.createObjectURL(new Blob([output],{type:"application/pdf"}));
    downloadButton.href=downloadUrl;

    const base=safeName(fileNameInput.value||"images-to-pdf.pdf");
    fileNameInput.value=base;downloadButton.download=base;
    resultInfo.textContent=`${items.length} images • ${pages} pages • ${bytesText(output.byteLength)}`;
    result.classList.add("show");setStatus("PDF created successfully.","success");
  }catch(err){
    console.error(err);
    setStatus(err&&err.message?err.message:"Could not create the PDF. Please try again.","error");
  }finally{busy=false;updateButtons()}
};
fileNameInput.addEventListener("input",()=>{
  const n=safeName(fileNameInput.value);
  downloadButton.download=n;
});
renderList();
})();