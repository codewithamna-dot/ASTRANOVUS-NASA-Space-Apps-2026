// Build-time tool only: npm install @napi-rs/canvas; ffmpeg must be on PATH.
const fs=require('node:fs'),vm=require('node:vm'),{spawn}=require('node:child_process'),{once}=require('node:events'),path=require('node:path');
const runtime=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
const {createCanvas}=require(runtime?path.join(runtime,'@napi-rs/canvas'):'@napi-rs/canvas');
const canvas=createCanvas(960,540);canvas.getBoundingClientRect=()=>({width:960,height:540});
const sandbox={console,Math,Set,document:{body:{classList:{contains:()=>false}}},devicePixelRatio:1};sandbox.window=sandbox;
vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist/scene3d.js'),'utf8'),sandbox);
(async()=>{
 const dest=path.join(__dirname,'../dist/assets/menu-loop.mp4');
 const ff=spawn('ffmpeg',['-y','-f','image2pipe','-vcodec','png','-r','24','-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','21','-pix_fmt','yuv420p','-movflags','+faststart',dest],{stdio:['pipe','ignore','pipe']});let error='';ff.stderr.on('data',b=>error+=b);const done=once(ff,'close');
 for(let i=0;i<192;i++){sandbox.Scene3D.renderFrame(canvas,i/24);const png=canvas.toBuffer('image/png');if(i===0)fs.writeFileSync(path.join(__dirname,'../dist/assets/menu-poster.png'),png);if(!ff.stdin.write(png))await once(ff.stdin,'drain');if(i%48===0)console.log('Rendered',i,'/192 frames');}
 ff.stdin.end();const [code]=await done;if(code)throw Error(error);console.log('Menu video complete:',dest);
 sandbox.Scene3D.renderFrame(canvas,0,'third');fs.writeFileSync('/workspace/scratch/f7d1cff5f5d7/walk-room-check.png',canvas.toBuffer('image/png'));
})().catch(e=>{console.error(e);process.exitCode=1;});
