self.onmessage = async function(e) {
  const { fileUrl, numPeaks } = e.data;
  
  try {
    // AudioContext no está disponible en todos los navegadores dentro de Workers
    if (typeof self.AudioContext === 'undefined' && typeof self.webkitAudioContext === 'undefined') {
      throw new Error('AudioContext not available in worker');
    }
    
    const audioContext = new (self.AudioContext || self.webkitAudioContext)();
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
    self.postMessage({ success: true, peaks });
  } catch (err) {
    self.postMessage({ success: false, error: err.message });
  }
};
