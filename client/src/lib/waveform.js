export async function extractWaveform(fileUrl, numPeaks = 200) {
  if (typeof Worker !== 'undefined') {
    try {
      return await extractWaveformWithWorker(fileUrl, numPeaks);
    } catch (err) {
      if (err.message && err.message.includes('AudioContext not available')) {
        console.info('Worker no soporta AudioContext, usando hilo principal');
      } else {
        console.warn('Worker failed, falling back to main thread:', err);
      }
    }
  }
  
  return extractWaveformMainThread(fileUrl, numPeaks);
}

function extractWaveformWithWorker(fileUrl, numPeaks) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../workers/waveform.worker.js', import.meta.url), { type: 'module' });
    
    worker.onmessage = (e) => {
      worker.terminate();
      if (e.data.success) {
        resolve(e.data.peaks);
      } else {
        reject(new Error(e.data.error));
      }
    };
    
    worker.onerror = (err) => {
      worker.terminate();
      reject(err);
    };
    
    worker.postMessage({ fileUrl, numPeaks });
  });
}

async function extractWaveformMainThread(fileUrl, numPeaks) {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const response = await fetch(fileUrl);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    const channelData = audioBuffer.getChannelData(0);
    const samplesPerPeak = Math.floor(channelData.length / numPeaks);
    const peaks = [];
    
    for (let i = 0; i < numPeaks; i++) {
      const start = i * samplesPerPeak;
      const end = Math.min(start + samplesPerPeak, channelData.length);
      let max = 0;
      
      for (let j = start; j < end; j++) {
        const abs = Math.abs(channelData[j]);
        if (abs > max) max = abs;
      }
      
      peaks.push(max);
    }
    
    audioContext.close();
    return peaks;
  } catch (err) {
    console.error('Failed to extract waveform:', err);
    return null;
  }
}
