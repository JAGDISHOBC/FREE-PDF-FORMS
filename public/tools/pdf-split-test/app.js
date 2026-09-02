(() => {
"use strict";
const $=id=>document.getElementById(id);
const uploadArea=$("uploadArea"),browseButton=$("browseButton"),fileInput=$("fileInput");
const fileInfo=$("fileInfo"),fileName=$("fileName"),fileMeta=$("fileMeta"),changeFileButton=$("changeFileButton");
const editor=$("editor"),rangeInput=$("rangeInput"),applyRange=$("applyRange"),parts=$("parts"),status=$("status");
const processButton=$("processButton"),resetButton=$("resetButton"),result=$("result"),resultSummary=$("resultSummary");
const fileList=$("fileList"),prefixInput=$("prefixInput"),downloadAllButton=$("downloadAllButton"),anotherButton=$("anotherButton");

let selectedFile=null,originalBytes=null,pdfDocument=null,ranges=[],outputs=[];

pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

function bytes(n){if(n<1024)return `${n} B`;if(n<1048576)return `${(n/1024).toFixed(1)} KB`;return `${(n/1048576).toFixed(2)} MB`}
function base(n){return n.replace(/\.pdf$/i,"")}
function show(msg,type=""){status.textContent=msg;status.className="status";if(type)status.classList.add(type);status.classList.remove("hidden")}
function resetStatus(){status.classList.add("hidden")}
function resetTool(){
 selectedFile=null;originalBytes=null;pdfDocument=null;ranges=[];outputs=[];fileInput.value="";
 fileInfo.classList.add("hidden");editor.classList.add("hidden");result.classList.add("hidden");
 parts.innerHTML="";rangeInput.value="";fileList.innerHTML="";resetStatus();
}
function parseRanges(value,total){
 const raw=value.split(",").map(x=>x.trim()).filter(Boolean);
 if(!raw.length) throw new Error("Enter at least one page range.");
 const result=[];const seen=new Set();
 for(const item of raw){
   const m=item.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
   if(!m) throw new Error(`Invalid range: ${item}`);
   let a=Number(m[1]),b=m[2]?Number(m[2]):a;
   if(a<1||b<1||a>total||b>total) throw new Error(`Page range "${item}" is outside 1-${total}.`);
   if(a>b)[a,b]=[b,a];
   const group=[];
   for(let p=a;p<=b;p++){if(!seen.has(p)){seen.add(p);group.push(p)}}
   if(group.length) result.push(group);
 }
 return result;
}
function renderParts(){
 parts.innerHTML="";
 ranges.forEach((group,i)=>{
   const div=document.createElement("div");div.className="part";
   const name=document.createElement("div");name.className="part-name";
   name.textContent=`Part ${i+1}: Pages ${group.join(", ")}`;
   const size=document.createElement("div");size.style.color="#697386";size.textContent=`${group.length} page${group.length===1?"":"s"}`;
   div.append(name,size);parts.appendChild(div);
 });
}
async function handleFile(file){
 resetStatus();if(!file)return;
 if(file.type!=="application/pdf"&&!/\.pdf$/i.test(file.name)){show("Please select a valid PDF file.","error");return}
 if(file.size>50*1024*1024){show("This PDF is larger than the 50 MB limit.","error");return}
 try{
   selectedFile=file;
   const buffer=await file.arrayBuffer();
   originalBytes=new Uint8Array(buffer.slice(0));
   const task=pdfjsLib.getDocument({data:originalBytes.slice(0)});
   pdfDocument=await task.promise;
   fileName.textContent=file.name;fileMeta.textContent=`${bytes(file.size)} • ${pdfDocument.numPages} pages`;
   fileInfo.classList.remove("hidden");editor.classList.remove("hidden");result.classList.add("hidden");
   prefixInput.value=`${base(file.name)}_Part`;
   rangeInput.value=`1-${pdfDocument.numPages}`;
   ranges=parseRanges(rangeInput.value,pdfDocument.numPages);renderParts();
   show("PDF loaded. Enter page ranges and preview the parts before splitting.","success");
 }catch(e){console.error(e);resetTool();show(`Could not open this PDF: ${e.message||"Unknown error"}`,"error")}
}
applyRange.addEventListener("click",()=>{
 try{
   ranges=parseRanges(rangeInput.value,pdfDocument.numPages);
   renderParts();
   show(`${ranges.length} output part${ranges.length===1?"":"s"} ready.`,"success");
 }catch(e){show(e.message,"error")}
});
async function processPDF(){
 if(!originalBytes||!pdfDocument)return;
 try{
   ranges=parseRanges(rangeInput.value,pdfDocument.numPages);renderParts();
   processButton.disabled=true;processButton.textContent="Creating PDFs...";show("Creating split PDF files...");
   const source=await PDFLib.PDFDocument.load(originalBytes.slice(0),{ignoreEncryption:false});
   outputs=[];
   for(let i=0;i<ranges.length;i++){
     const out=await PDFLib.PDFDocument.create();
     const indexes=ranges[i].map(p=>p-1);
     const copied=await out.copyPages(source,indexes);
     copied.forEach(p=>out.addPage(p));
     const data=await out.save({useObjectStreams:true,addDefaultPage:false});
     outputs.push({part:i+1,pages:ranges[i].slice(),blob:new Blob([data],{type:"application/pdf"})});
   }
   resultSummary.textContent=`Created ${outputs.length} PDF file${outputs.length===1?"":"s"} from ${pdfDocument.numPages} original pages.`;
   fileList.innerHTML="";
   outputs.forEach(o=>{
     const row=document.createElement("div");row.className="file-item";
     const left=document.createElement("div");left.innerHTML=`<strong>Part ${o.part}</strong><br>Pages ${o.pages.join(", ")} • ${bytes(o.blob.size)}`;
     row.appendChild(left);fileList.appendChild(row);
   });
   editor.classList.add("hidden");result.classList.remove("hidden");
   show("PDF split successfully.","success");
 }catch(e){console.error(e);show(`Could not split the PDF: ${e.message||"Unknown error"}`,"error")}
 finally{processButton.disabled=false;processButton.textContent="Split PDF"}
}
function safeName(s){return s.replace(/[<>:"/\\|?*\x00-\x1F]/g,"_").trim()||"Split_PDF"}
function downloadBlob(blob,name){
 const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;
 document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)
}
downloadAllButton.addEventListener("click",()=>{
 if(!outputs.length)return;
 const prefix=safeName(prefixInput.value);
 outputs.forEach((o,i)=>downloadBlob(o.blob,`${prefix}_${i+1}.pdf`));
});
browseButton.addEventListener("click",e=>{e.stopPropagation();fileInput.click()});
uploadArea.addEventListener("click",e=>{if(e.target!==browseButton)fileInput.click()});
uploadArea.addEventListener("dragover",e=>{e.preventDefault();uploadArea.classList.add("dragover")});
uploadArea.addEventListener("dragleave",()=>uploadArea.classList.remove("dragover"));
uploadArea.addEventListener("drop",e=>{e.preventDefault();uploadArea.classList.remove("dragover");handleFile(e.dataTransfer.files[0])});
fileInput.addEventListener("change",e=>handleFile(e.target.files[0]));
changeFileButton.addEventListener("click",()=>{resetTool();fileInput.click()});
anotherButton.addEventListener("click",()=>{resetTool();fileInput.click()});
resetButton.addEventListener("click",resetTool);
processButton.addEventListener("click",processPDF);
})();