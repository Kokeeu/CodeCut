const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const FFMPEG = path.join(__dirname, '..', 'node_modules', 'ffmpeg-static', 'ffmpeg.exe');
const TEMP = path.join(__dirname, '..', 'temp', 'test');

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const p = spawn(FFMPEG, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    p.stderr.on('data', (d) => { stderr += d.toString(); });
    p.on('error', reject);
    p.on('exit', (code) => {
      if (code === 0) resolve(stderr);
      else reject(new Error(`exit ${code}\n${stderr}`));
    });
  });
}

async function main() {
  const a = path.join(TEMP, 'a.mp4');
  const b = path.join(TEMP, 'b.mp4');
  const out = path.join(TEMP, 'manual.mp4');

  // Replicate the failing 3-clips graph
  const graph = [
    '[0:v]trim=start=0.000:end=1.000,setpts=PTS-STARTPTS,crop=in_h*9/16:in_h,scale=1080:1920:flags=lanczos,setsar=1,fps=30,format=yuv420p[v0]',
    '[0:a]atrim=start=0.000:end=1.000,asetpts=PTS-STARTPTS,aresample=44100[a0]',
    '[1:v]trim=start=1.000:end=2.000,setpts=PTS-STARTPTS,crop=in_h*9/16:in_h,scale=1080:1920:flags=lanczos,setsar=1,fps=30,format=yuv420p[v1]',
    '[1:a]atrim=start=1.000:end=2.000,asetpts=PTS-STARTPTS,aresample=44100[a1]',
    '[2:v]trim=start=1.500:end=2.500,setpts=PTS-STARTPTS,crop=in_h*9/16:in_h,scale=1080:1920:flags=lanczos,setsar=1,fps=30,format=yuv420p[v2]',
    '[2:a]atrim=start=1.500:end=2.500,asetpts=PTS-STARTPTS,aresample=44100[a2]',
    '[v0][v1]xfade=transition=fade:duration=0.300:offset=0.700[vc0]',
    '[a0][a1]acrossfade=d=0.300:c1=tri:c2=tri[ac0]',
    '[vc0][ac0][v2][a2]concat=n=2:v=1:a=1[vout][aout]',
  ].join(';');

  try {
    const stderr = await runFfmpeg([
      '-i', a, '-i', b, '-i', a,
      '-y',
      '-filter_complex', graph,
      '-map', '[vout]', '-map', '[aout]',
      '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '20',
      '-c:a', 'aac', '-b:a', '128k',
      '-pix_fmt', 'yuv420p',
      '-shortest',
      out,
    ]);
    console.log('OK');
  } catch (e) {
    console.log('FAILED. Last 60 lines of stderr:');
    console.log(e.message.split('\n').slice(-60).join('\n'));
  }
}

main();
