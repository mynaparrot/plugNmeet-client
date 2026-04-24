import { useCallback, useEffect } from 'react';
import { once } from 'es-toolkit';
import { updateFocusActiveSpeakerWebcam } from '../../store/slices/roomSettingsSlice';
import { useAppDispatch } from '../../store';
import { getConfigValue } from '../utils';

export interface ICustomDesignParams {
  primary_color?: string;
  primary_btn_bg_color?: string;
  primary_btn_text_color?: string;

  secondary_color?: string;
  secondary_btn_bg_color?: string;
  secondary_btn_text_color?: string;

  background_color?: string;
  background_image?: string;

  header_bg_color?: string;
  footer_bg_color?: string;
  footer_icon_bg_color?: string;
  footer_icon_color?: string;

  // @deprecated  Use `side-panel-bg-color` instead.
  right_side_bg_color?: string;
  side_panel_bg_color?: string;

  custom_css_url?: string;
  custom_logo?: string;
}

// Helper functions to check color contrast
const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

const getLuminance = (r: number, g: number, b: number) => {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
};

const getContrastRatio = (hex1: string, hex2: string) => {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);

  if (!rgb1 || !rgb2) {
    return 1;
  }

  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);

  return (brightest + 0.05) / (darkest + 0.05);
};

const MIN_CONTRAST_RATIO = 4.5;

const useClientCustomization = () => {
  const dispatch = useAppDispatch();

  // different config related customization
  useEffect(() => {
    const focusActiveSpeakerWebcam = getConfigValue<boolean>(
      'focusActiveSpeakerWebcam',
      true,
      'FOCUS_ACTIVE_SPEAKER_WEBCAM',
    );
    dispatch(updateFocusActiveSpeakerWebcam(focusActiveSpeakerWebcam));
  }, [dispatch]);

  // oxlint-disable-next-line exhaustive-deps
  const freezeConfig = useCallback(
    once(() => {
      setTimeout(() => {
        const config = (window as any).plugNmeetConfig;
        if (config && typeof config === 'object') {
          // 1. Freeze the configuration object to make its properties read-only.
          // This prevents accidental modifications to the object's contents.
          Object.freeze(config);

          // 2. Redefine the property on the window object to be non-writable and non-configurable.
          // This prevents the entire `plugNmeetConfig` object from being reassigned (e.g., to null) or deleted.
          Object.defineProperty(window, 'plugNmeetConfig', {
            value: config,
            writable: false,
            configurable: false,
          });
        }
      }, 500);
    }),
    [],
  );

  // design customization
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    let customDesign = urlParams.get('custom_design');

    if (!customDesign || customDesign === '{}') {
      customDesign = getConfigValue<string>(
        'designCustomization',
        undefined,
        'DESIGN_CUSTOMIZATION',
      );
    } else {
      // set customization value from URL
      (window as any).plugNmeetConfig.designCustomization = customDesign;
    }

    if (!customDesign || customDesign === '{}') {
      freezeConfig();
      return;
    }

    let designCustomParams: ICustomDesignParams = {};
    if (typeof customDesign === 'object') {
      designCustomParams = customDesign;
    } else {
      try {
        designCustomParams = JSON.parse(customDesign);
      } catch (e) {
        console.error("can't parse custom design params", e);
        freezeConfig();
        return;
      }
    }

    // first set the logo
    if (designCustomParams.custom_logo) {
      // from design params let's assume logo will be only light to reduce complexity
      (window as any).plugNmeetConfig.customLogo = {
        main_logo_light: designCustomParams.custom_logo,
        main_logo_dark: designCustomParams.custom_logo,
      };
    }
    freezeConfig();

    let css = '';
    const DEFAULT_LIGHT_THEME_BG = '#f0f6fc'; // --color-Gray-50
    const DEFAULT_LIGHT_THEME_TEXT = '#233240'; // --color-Gray-800

    const isContrastOk = (
      color1: string,
      color2: string,
      color1Name: string,
      color2Name: string,
    ) => {
      const contrast = getContrastRatio(color1, color2);
      if (contrast >= MIN_CONTRAST_RATIO) {
        return true;
      }
      console.warn(
        `Color combination (${color1Name}: ${color1}, ${color2Name}: ${color2}) has insufficient contrast (${contrast.toFixed(
          2,
        )}:1) and will not be applied. Minimum required is ${MIN_CONTRAST_RATIO}:1.`,
      );
      return false;
    };

    if (
      designCustomParams.primary_color &&
      isContrastOk(
        designCustomParams.primary_color,
        DEFAULT_LIGHT_THEME_BG,
        'primary_color',
        'Default Background',
      )
    ) {
      const color = designCustomParams.primary_color;
      css += `body:not(.dark) .primaryColor{ color: ${color}}`;
      css += `body:not(.dark) .text-primary-color { color: ${color}}`;
      css += `body:not(.dark) .placeholder\\:text-primaryColor\\/70::placeholder { color: ${color}}`;
      css += `body:not(.dark) .bg-primary-color { background: ${color} !important;}`;
      css += `body:not(.dark) .hover\\:bg-primaryColor:hover { background: ${color} !important;}`;
      css += `body:not(.dark) .border-primary-color { border-color: ${color} !important;}`;
      css += `body:not(.dark) .excalidraw {
        --color-primary: ${color};
        --color-primary-darker: ${color};
        --color-primary-darkest: ${color};
      }`;
    }

    if (
      designCustomParams.secondary_color &&
      isContrastOk(
        designCustomParams.secondary_color,
        DEFAULT_LIGHT_THEME_BG,
        'secondary_color',
        'Default Background',
      )
    ) {
      const color = designCustomParams.secondary_color;
      css += `body:not(.dark) .secondaryColor { color: ${color} !important;}`;
      css += `body:not(.dark) .text-secondary-color { color: ${color} !important;}`;
      css += `body:not(.dark) .bg-secondary-color { background: ${color} !important;}`;
      css += `body:not(.dark) .hover\\:text-secondaryColor:hover { color: ${color} !important;}`;
      css += `body:not(.dark) .group:hover .group-hover\\:text-secondaryColor { color: ${color} !important;}`;
      css += `body:not(.dark) .bg-secondaryColor, .hover:bg-secondaryColor:hover { background: ${color} !important;}`;
      css += `body:not(.dark) .hover:bg-secondaryColor:hover { background: ${color} !important;}`;
      css += `body:not(.dark) .border-secondary-color { border-color: ${color} !important;}`;
      css += `body:not(.dark) .excalidraw { --color-primary-light: ${color}; }`;
    }

    if (designCustomParams.background_image) {
      css += `body:not(.dark) #main-area, body:not(.dark) .error-app-bg, body:not(.dark) .waiting-room { 
        background: url("${designCustomParams.background_image}") !important;
        background-position: center !important;
        background-repeat: no-repeat !important;
        background-size: cover !important;
      }`;
    } else if (
      designCustomParams.background_color &&
      isContrastOk(
        designCustomParams.background_color,
        DEFAULT_LIGHT_THEME_TEXT,
        'background_color',
        'Default Text',
      )
    ) {
      css += `body:not(.dark) #main-area, body:not(.dark) .error-app-bg, body:not(.dark) .waiting-room { 
        background: ${designCustomParams.background_color} !important;
      }`;
    }

    if (
      designCustomParams.header_bg_color &&
      isContrastOk(
        designCustomParams.header_bg_color,
        '#FFFFFF', // Header text is typically white
        'header_bg_color',
        'White Text',
      )
    ) {
      css += `body:not(.dark) header#main-header { background: ${designCustomParams.header_bg_color}; }`;
    }

    if (
      designCustomParams.footer_bg_color &&
      isContrastOk(
        designCustomParams.footer_bg_color,
        '#FFFFFF', // Footer text is typically white
        'footer_bg_color',
        'White Text',
      )
    ) {
      css += `body:not(.dark) footer#main-footer { background: ${designCustomParams.footer_bg_color}; }`;
    }

    if (
      designCustomParams.footer_icon_bg_color &&
      designCustomParams.footer_icon_color &&
      isContrastOk(
        designCustomParams.footer_icon_bg_color,
        designCustomParams.footer_icon_color,
        'footer_icon_bg_color',
        'footer_icon_color',
      )
    ) {
      css += `body:not(.dark) .footer-icon-bg { background: ${designCustomParams.footer_icon_bg_color}; color: ${designCustomParams.footer_icon_color}; }`;
    } else {
      if (
        designCustomParams.footer_icon_bg_color &&
        isContrastOk(
          designCustomParams.footer_icon_bg_color,
          '#FFFFFF', // Assuming icon color is light
          'footer_icon_bg_color',
          'White Text',
        )
      ) {
        css += `body:not(.dark) .footer-icon-bg { background: ${designCustomParams.footer_icon_bg_color}; }`;
      }
      if (
        designCustomParams.footer_icon_color &&
        isContrastOk(
          designCustomParams.footer_icon_color,
          DEFAULT_LIGHT_THEME_BG, // Assuming icon bg is light
          'footer_icon_color',
          'Default Background',
        )
      ) {
        css += `body:not(.dark) .footer-icon-bg { color: ${designCustomParams.footer_icon_color}; }`;
      }
    }

    // Primary button customization
    const primaryBtnBg =
      designCustomParams.primary_btn_bg_color ||
      designCustomParams.primary_color;
    const primaryBtnText =
      designCustomParams.primary_btn_text_color || '#FFFFFF'; // Default to white

    if (
      primaryBtnBg &&
      isContrastOk(
        primaryBtnBg,
        primaryBtnText,
        'Primary Button BG',
        'Primary Button Text',
      )
    ) {
      if (
        designCustomParams.primary_btn_bg_color ||
        designCustomParams.primary_color
      ) {
        css += `body:not(.dark) .primary-button { background: ${primaryBtnBg}; }`;
      }
      if (designCustomParams.primary_btn_text_color) {
        css += `body:not(.dark) .primary-button { color: ${primaryBtnText}; }`;
      }
    }

    // Secondary button customization
    const secondaryBtnBg =
      designCustomParams.secondary_btn_bg_color ||
      designCustomParams.secondary_color;
    const secondaryBtnText =
      designCustomParams.secondary_btn_text_color || DEFAULT_LIGHT_THEME_TEXT;

    if (
      secondaryBtnBg &&
      isContrastOk(
        secondaryBtnBg,
        secondaryBtnText,
        'Secondary Button BG',
        'Secondary Button Text',
      )
    ) {
      if (
        designCustomParams.secondary_btn_bg_color ||
        designCustomParams.secondary_color
      ) {
        css += `body:not(.dark) .secondary-button { background: ${secondaryBtnBg}; }`;
      }
      if (designCustomParams.secondary_btn_text_color) {
        css += `body:not(.dark) .secondary-button { color: ${secondaryBtnText}; }`;
      }
    }

    const sidePanelBgColor =
      designCustomParams.side_panel_bg_color ||
      designCustomParams.right_side_bg_color;
    if (
      sidePanelBgColor &&
      isContrastOk(
        sidePanelBgColor,
        DEFAULT_LIGHT_THEME_TEXT,
        'side_panel_bg_color',
        'Default Text',
      )
    ) {
      css += `body:not(.dark) .side-panel-bg-color { background: ${sidePanelBgColor}; }`;
    }

    const head = document.head;
    let link: HTMLLinkElement, style: HTMLStyleElement;

    if (designCustomParams.custom_css_url) {
      link = document.createElement('link');
      link.type = 'text/css';
      link.rel = 'stylesheet';
      link.href = designCustomParams.custom_css_url;
      head.appendChild(link);
    }

    if (css !== '') {
      style = document.createElement('style');
      style.id = 'plugNmeetCustomization';
      style.textContent = css;
      head.appendChild(style);
    }

    return () => {
      if (css !== '') {
        const customStyle = document.getElementById('plugNmeetCustomization');
        if (customStyle) {
          head.removeChild(customStyle);
        }
      }
      if (designCustomParams.custom_css_url && link) {
        head.removeChild(link);
      }
    };
  }, [dispatch, freezeConfig]);
};

export default useClientCustomization;
