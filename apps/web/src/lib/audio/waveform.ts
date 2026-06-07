export type WaveformSampler = {
  getLevel: () => number;
  close: () => void;
};

export function createWaveformSampler(stream: MediaStream): WaveformSampler {
  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();

  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.82;
  source.connect(analyser);

  const buffer = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;

  return {
    getLevel: () => sampleAudioLevel(analyser, buffer),
    close: () => {
      source.disconnect();
      analyser.disconnect();
      void audioContext.close();
    },
  };
}

export function sampleAudioLevel(analyser: AnalyserNode, buffer: Uint8Array<ArrayBuffer>) {
  analyser.getByteFrequencyData(buffer);

  let sum = 0;

  for (let index = 0; index < buffer.length; index += 1) {
    sum += buffer[index] ?? 0;
  }

  const average = sum / buffer.length / 255;
  return clamp(average * 1.8, 0, 1);
}

export function levelToPercent(level: number) {
  return Math.round(clamp(level, 0, 1) * 100);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
