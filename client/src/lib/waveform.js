export async function extractWaveform(fileUrl, numPeaks = 200) {
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
