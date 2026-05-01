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

    if (designCustomParams.primary_color) {
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

    if (designCustomParams.secondary_color) {
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
    } else if (designCustomParams.background_color) {
      css += `body:not(.dark) #main-area, body:not(.dark) .error-app-bg, body:not(.dark) .waiting-room { 
        background: ${designCustomParams.background_color} !important;
      }`;
    }

    if (designCustomParams.header_bg_color) {
      css += `body:not(.dark) header#main-header { background: ${designCustomParams.header_bg_color}; }`;
    }

    if (designCustomParams.footer_bg_color) {
      css += `body:not(.dark) footer#main-footer { background: ${designCustomParams.footer_bg_color}; }`;
    }

    if (
      designCustomParams.footer_icon_bg_color &&
      designCustomParams.footer_icon_color
    ) {
      css += `body:not(.dark) .footer-icon-bg { background: ${designCustomParams.footer_icon_bg_color}; color: ${designCustomParams.footer_icon_color}; }`;
    } else {
      if (designCustomParams.footer_icon_bg_color) {
        css += `body:not(.dark) .footer-icon-bg { background: ${designCustomParams.footer_icon_bg_color}; }`;
      }
      if (designCustomParams.footer_icon_color) {
        css += `body:not(.dark) .footer-icon-bg { color: ${designCustomParams.footer_icon_color}; }`;
      }
    }

    // Primary button customization
    const primaryBtnBg =
      designCustomParams.primary_btn_bg_color ||
      designCustomParams.primary_color;
    const primaryBtnText = designCustomParams.primary_btn_text_color;

    if (primaryBtnBg) {
      if (
        designCustomParams.primary_btn_bg_color ||
        designCustomParams.primary_color
      ) {
        css += `body:not(.dark) .primary-button { background: ${primaryBtnBg}; }`;
      }
      if (primaryBtnText) {
        css += `body:not(.dark) .primary-button { color: ${primaryBtnText}; }`;
      }
    }

    // Secondary button customization
    const secondaryBtnBg =
      designCustomParams.secondary_btn_bg_color ||
      designCustomParams.secondary_color;
    const secondaryBtnText = designCustomParams.secondary_btn_text_color;

    if (secondaryBtnBg) {
      if (
        designCustomParams.secondary_btn_bg_color ||
        designCustomParams.secondary_color
      ) {
        css += `body:not(.dark) .secondary-button { background: ${secondaryBtnBg}; }`;
      }
      if (secondaryBtnText) {
        css += `body:not(.dark) .secondary-button { color: ${secondaryBtnText}; }`;
      }
    }

    const sidePanelBgColor =
      designCustomParams.side_panel_bg_color ||
      designCustomParams.right_side_bg_color;
    if (sidePanelBgColor) {
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
