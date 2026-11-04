import { useCallback, useEffect } from 'react';
import { once } from 'es-toolkit';

import {
  updateFocusActiveSpeakerWebcam,
  updateMaxNumDisplayWebcams,
} from '../../store/slices/roomSettingsSlice';
import { useAppDispatch } from '../../store';
import { getConfigValue, isValidHttpUrl } from '../utils';
import { IMaxNumDisplayWebcams } from '../../store/slices/interfaces/roomSettings';

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

function isObject(value: any): value is object {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

const CSS_BREAKOUT_RE = /[;{}()"'\\<>]|url\(/i;

const sanitizeCssValue = (val?: string): string | undefined => {
  const trimmed = val?.trim();
  if (!trimmed || CSS_BREAKOUT_RE.test(trimmed)) {
    return undefined;
  }
  return trimmed;
};

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

    const maxNumDisplayWebcams = getConfigValue<IMaxNumDisplayWebcams>('maxNumDisplayWebcams');

    if (
      maxNumDisplayWebcams &&
      isObject(maxNumDisplayWebcams) &&
      (maxNumDisplayWebcams.desktop || maxNumDisplayWebcams.tablet || maxNumDisplayWebcams.mobile)
    ) {
      dispatch(updateMaxNumDisplayWebcams(maxNumDisplayWebcams));
    }
  }, [dispatch]);

  // oxlint-disable-next-line exhaustive-deps
  const freezeConfig = useCallback(
    // oxlint-disable-next-line react/use-memo
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

    const primaryColor = sanitizeCssValue(designCustomParams.primary_color);
    if (primaryColor) {
      const color = primaryColor;
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

    const secondaryColor = sanitizeCssValue(designCustomParams.secondary_color);
    if (secondaryColor) {
      const color = secondaryColor;
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

    const backgroundImage = designCustomParams.background_image?.trim();
    if (backgroundImage && isValidHttpUrl(backgroundImage) && !/["'()\\;]/.test(backgroundImage)) {
      css += `body:not(.dark) #main-area, body:not(.dark) .error-app-bg, body:not(.dark) .waiting-room { 
        background: url("${backgroundImage}") !important;
        background-position: center !important;
        background-repeat: no-repeat !important;
        background-size: cover !important;
      }`;
    } else {
      const backgroundColor = sanitizeCssValue(designCustomParams.background_color);
      if (backgroundColor) {
        css += `body:not(.dark) #main-area, body:not(.dark) .error-app-bg, body:not(.dark) .waiting-room { 
        background: ${backgroundColor} !important;
      }`;
      }
    }

    const headerBgColor = sanitizeCssValue(designCustomParams.header_bg_color);
    if (headerBgColor) {
      css += `body:not(.dark) header#main-header { background: ${headerBgColor}; }`;
    }

    const footerBgColor = sanitizeCssValue(designCustomParams.footer_bg_color);
    if (footerBgColor) {
      css += `body:not(.dark) footer#main-footer { background: ${footerBgColor}; }`;
    }

    const footerIconBgColor = sanitizeCssValue(designCustomParams.footer_icon_bg_color);
    const footerIconColor = sanitizeCssValue(designCustomParams.footer_icon_color);
    if (footerIconBgColor && footerIconColor) {
      css += `body:not(.dark) .footer-icon-bg { background: ${footerIconBgColor}; color: ${footerIconColor}; }`;
    } else {
      if (footerIconBgColor) {
        css += `body:not(.dark) .footer-icon-bg { background: ${footerIconBgColor}; }`;
      }
      if (footerIconColor) {
        css += `body:not(.dark) .footer-icon-bg { color: ${footerIconColor}; }`;
      }
    }

    // Primary button customization
    const primaryBtnBg = sanitizeCssValue(designCustomParams.primary_btn_bg_color) || primaryColor;
    const primaryBtnText = sanitizeCssValue(designCustomParams.primary_btn_text_color);

    if (primaryBtnBg) {
      css += `body:not(.dark) .primary-button { background: ${primaryBtnBg}; }`;
      if (primaryBtnText) {
        css += `body:not(.dark) .primary-button { color: ${primaryBtnText}; }`;
      }
    }

    // Secondary button customization
    const secondaryBtnBg =
      sanitizeCssValue(designCustomParams.secondary_btn_bg_color) || secondaryColor;
    const secondaryBtnText = sanitizeCssValue(designCustomParams.secondary_btn_text_color);

    if (secondaryBtnBg) {
      css += `body:not(.dark) .secondary-button { background: ${secondaryBtnBg}; }`;
      if (secondaryBtnText) {
        css += `body:not(.dark) .secondary-button { color: ${secondaryBtnText}; }`;
      }
    }

    const sidePanelBgColor =
      sanitizeCssValue(designCustomParams.side_panel_bg_color) ||
      sanitizeCssValue(designCustomParams.right_side_bg_color);
    if (sidePanelBgColor) {
      css += `body:not(.dark) .side-panel-bg-color { background: ${sidePanelBgColor}; }`;
    }

    const head = document.head;
    let link: HTMLLinkElement | undefined, style: HTMLStyleElement | undefined;

    const customCssUrl = designCustomParams.custom_css_url;
    if (customCssUrl && isValidHttpUrl(customCssUrl)) {
      link = document.createElement('link');
      link.type = 'text/css';
      link.rel = 'stylesheet';
      link.href = customCssUrl;
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
      if (link) {
        head.removeChild(link);
      }
    };
    // oxlint-disable-next-line react/exhaustive-effect-dependencies
  }, [dispatch, freezeConfig]);
};

export default useClientCustomization;
