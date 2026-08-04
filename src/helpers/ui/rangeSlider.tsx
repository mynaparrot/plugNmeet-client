import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { useTranslation } from 'react-i18next';
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
  label?: string;
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
  label,
}: RangeSliderProps) => {
  const { i18n } = useTranslation();
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
      const isRtl = i18n.dir() === 'rtl';
      let position = isRtl
        ? (rect.right - clientX) / rect.width
        : (clientX - rect.left) / rect.width;
      position = Math.max(0, Math.min(1, position)); // Clamp between 0-1

      const newValue = Math.round(min + position * (max - min));

      if (onChange) {
        onChange(newValue);
      } else {
        setInternalValue(newValue);
      }
    },
    [min, max, onChange, setInternalValue, i18n],
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

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const step = Math.max(1, Math.round((max - min) / 100));
      let newValue = value;
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowUp':
          e.preventDefault();
          newValue = Math.min(
            max,
            value +
              (i18n.dir() === 'rtl' && e.key === 'ArrowRight' ? -step : step),
          );
          break;
        case 'ArrowLeft':
        case 'ArrowDown':
          e.preventDefault();
          newValue = Math.max(
            min,
            value -
              (i18n.dir() === 'rtl' && e.key === 'ArrowLeft' ? -step : step),
          );
          break;
        case 'Home':
          e.preventDefault();
          newValue = min;
          break;
        case 'End':
          e.preventDefault();
          newValue = max;
          break;
        default:
          return;
      }
      if (newValue !== value) {
        if (onChange) {
          onChange(newValue);
        } else {
          setInternalValue(newValue);
        }
      }
    },
    [min, max, value, onChange, i18n],
  );

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
          role="slider"
          tabIndex={0}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-label={label ?? 'Slider'}
          style={{
            insetInlineStart: `${fillPercentage}%`,
            width: `${thumbSize}px`,
            height: `${thumbSize}px`,
            backgroundColor: thumbColor,
            marginInlineStart: `-${thumbSize / 2}px`,
            marginTop: `-${thumbSize / 2}px`,
            borderWidth: 2,
            borderColor: '#0088CC',
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onKeyDown={handleKeyDown}
        />
      </div>
    </div>
  );
};

export default RangeSlider;
