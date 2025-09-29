import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { throttle } from 'es-toolkit';

interface RangeSliderProps {
  min?: number;
  max?: number;
  value?: number;
  onChange?: (value: number) => void;
  thumbSize?: number;
  trackHeight?: number;
  filledColor?: string;
  emptyColor?: string;
  thumbColor?: string;
}

const RangeSlider = ({
  min = 0,
  max = 100,
  value: propValue = 50,
  onChange,
  thumbSize = 24,
  trackHeight = 8,
  filledColor = 'linear-gradient(90deg, #F0F8FC 0%, #BAE3F7 25%, #32B7FA 50%, #00A1F2 75%, #0088CC 100%)',
  emptyColor = 'rgba(225, 237, 250, 1)',
  thumbColor = '#fff',
}: RangeSliderProps) => {
  const [internalValue, setInternalValue] = useState<number>(propValue);
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);

  // Use controlled component pattern
  const value = onChange !== undefined ? propValue : internalValue;

  const updateValueFromPosition = useCallback(
    (clientX: number) => {
      if (!sliderRef.current) return;

      const rect = sliderRef.current.getBoundingClientRect();
      let position = (clientX - rect.left) / rect.width;
      position = Math.max(0, Math.min(1, position)); // Clamp between 0-1

      const newValue = Math.round(min + position * (max - min));

      if (onChange) {
        onChange(newValue);
      } else {
        setInternalValue(newValue);
      }
    },
    [min, max, onChange, setInternalValue],
  );

  const throttledUpdate = useMemo(
    () => throttle(updateValueFromPosition, 16), // throttle to ~60fps
    [updateValueFromPosition],
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      throttledUpdate(e.clientX);
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        throttledUpdate(e.touches[0].clientX);
      }
    };

    const handleMouseUp = () => setIsDragging(false);
    const handleTouchEnd = () => setIsDragging(false);

    if (!isDragging) return;

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, throttledUpdate]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    updateValueFromPosition(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    updateValueFromPosition(e.touches[0].clientX);
  };

  const fillPercentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="custom-range-container">
      <div
        ref={sliderRef}
        className="custom-range-track"
        style={{
          height: `${trackHeight}px`,
          backgroundColor: emptyColor,
        }}
      >
        <div
          className="custom-range-fill"
          style={{
            width: `${fillPercentage}%`,
            background: filledColor,
            height: `${trackHeight}px`,
          }}
        />
        <div
          ref={thumbRef}
          className="custom-range-thumb"
          style={{
            left: `${fillPercentage}%`,
            width: `${thumbSize}px`,
            height: `${thumbSize}px`,
            backgroundColor: thumbColor,
            marginLeft: `-${thumbSize / 2}px`,
            marginTop: `-${thumbSize / 2}px`,
            borderWidth: 2,
            borderColor: '#0088CC',
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        />
      </div>
    </div>
  );
};

export default RangeSlider;
