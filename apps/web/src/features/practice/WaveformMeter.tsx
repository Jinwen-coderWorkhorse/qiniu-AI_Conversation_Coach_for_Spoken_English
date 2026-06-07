type WaveformMeterProps = {
  level: number;
  isActive?: boolean;
};

const BAR_COUNT = 12;

export function WaveformMeter({ level, isActive = false }: WaveformMeterProps) {
  const clampedLevel = Math.max(0, Math.min(1, level));

  return (
    <div
      className="waveform-meter"
      aria-hidden={!isActive}
      aria-label={isActive ? "录音音量波形" : undefined}
    >
      {Array.from({ length: BAR_COUNT }, (_, index) => {
        const threshold = (index + 1) / BAR_COUNT;
        const active = isActive && clampedLevel >= threshold * 0.55;
        const height = 18 + index * 4;

        return (
          <span
            className="waveform-meter-bar"
            data-active={active ? "true" : "false"}
            key={index}
            style={{ height: `${height}px` }}
          />
        );
      })}
    </div>
  );
}
