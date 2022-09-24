import { useEffect } from 'react';

export interface ICustomDesignParams {
  primary_color?: string;
  secondary_color?: string;
  background_color?: string;
  background_image?: string;
  header_bg_color?: string;
  footer_bg_color?: string;
  left_side_bg_color?: string;
  right_side_bg_color?: string;
  custom_css_url?: string;
  custom_logo?: string;
}

const useDesignCustomization = () => {
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const custom_design = urlParams.get('custom_design');

    if (custom_design && custom_design !== '' && custom_design !== '{}') {
      // we'll override if custom design sent by URL
      (window as any).DESIGN_CUSTOMIZATION = custom_design;
    }

    if (typeof (window as any).DESIGN_CUSTOMIZATION === 'undefined') {
      return;
    }

    let designCustomParams: ICustomDesignParams = {};
    try {
      designCustomParams = JSON.parse((window as any).DESIGN_CUSTOMIZATION);
    } catch (e) {
      console.error("can't parse custom design params");
      return;
    }

    let css = '';

    if (designCustomParams.primary_color) {
      css += '.primaryColor{ color: ' + designCustomParams.primary_color + '}';
      css +=
        '.text-primaryColor { color: ' + designCustomParams.primary_color + '}';
      css +=
        '.placeholder\\:text-primaryColor\\/70::placeholder { color: ' +
        designCustomParams.primary_color +
        '}';
      css +=
        '.bg-primaryColor { background: ' +
        designCustomParams.primary_color +
        ' !important;}';
      css +=
        '.hover\\:bg-primaryColor:hover { background: ' +
        designCustomParams.primary_color +
        ' !important;}';
      css +=
        '.border-primaryColor { border-color: ' +
        designCustomParams.primary_color +
        ' !important;}';
      css +=
        '.excalidraw {\n' +
        '    --color-primary: ' +
        designCustomParams.primary_color +
        ';\n' +
        '    --color-primary-darker: ' +
        designCustomParams.primary_color +
        ';\n' +
        '    --color-primary-darkest: ' +
        designCustomParams.primary_color +
        ';\n' +
        '}';
    }

    if (designCustomParams.secondary_color) {
      css +=
        '.secondaryColor { color: ' +
        designCustomParams.secondary_color +
        ' !important;}';
      css +=
        '.text-secondaryColor { color: ' +
        designCustomParams.secondary_color +
        ' !important;}';
      css +=
        '.bg-secondaryColor { background: ' +
        designCustomParams.secondary_color +
        ' !important;}';
      css +=
        '.hover\\:text-secondaryColor:hover { color: ' +
        designCustomParams.secondary_color +
        ' !important;}';
      css +=
        '.group:hover .group-hover\\:text-secondaryColor { color: ' +
        designCustomParams.secondary_color +
        ' !important;}';
      css +=
        '.bg-secondaryColor, .hover:bg-secondaryColor:hover { background: ' +
        designCustomParams.secondary_color +
        ' !important;}';
      css +=
        '.hover:bg-secondaryColor:hover { background: ' +
        designCustomParams.secondary_color +
        ' !important;}';
      css +=
        '.border-secondaryColor { border-color: ' +
        designCustomParams.secondary_color +
        ' !important;}';
      css +=
        '.excalidraw {\n' +
        '    --color-primary-light: ' +
        designCustomParams.secondary_color +
        ';\n' +
        '}';
    }

    if (designCustomParams.background_image) {
      css += `.main-app-bg { 
        background: url("${designCustomParams.background_image}") !important;
        background-position: center !important;
        background-repeat: no-repeat !important;
        background-size: cover !important;
        }`;
      css += `.error-app-bg { 
        background: url("${designCustomParams.background_image}") !important;
        background-position: center !important;
        background-repeat: no-repeat !important;
        background-size: cover !important;
        }`;
      css += `.waiting-room { 
        background: url("${designCustomParams.background_image}") !important;
        background-position: center !important;
        background-repeat: no-repeat !important;
        background-size: cover !important;
        }`;
      // css += `.main-app-bg::before, .waiting-room::before, .error-app-bg::before {
      //     position: absolute;
      //     content: "";
      //     width: 100%;
      //     height: 100%;
      //     background-color: #001222;
      //     opacity: 0.5;
      // }`;
    } else if (designCustomParams.background_color) {
      css += `.main-app-bg { 
        background: ${designCustomParams.background_color} !important;
        }`;
      css += `.error-app-bg { 
        background: ${designCustomParams.background_color} !important;
        }`;
      css += `.waiting-room { 
        background: ${designCustomParams.background_color} !important;
        }`;
    }

    if (designCustomParams.header_bg_color) {
      css +=
        'header#main-header { background: ' +
        designCustomParams.header_bg_color +
        '; }';
    }

    if (designCustomParams.footer_bg_color) {
      css +=
        'footer#main-footer { background: ' +
        designCustomParams.footer_bg_color +
        '; }';
    }

    if (designCustomParams.left_side_bg_color) {
      css +=
        '.participants-wrapper { background: ' +
        designCustomParams.left_side_bg_color +
        '; }';
      css +=
        '.vertical-webcams { background: ' +
        designCustomParams.left_side_bg_color +
        ' !important; }';
    }

    if (designCustomParams.right_side_bg_color) {
      css +=
        '.messageModule-wrapper { background: ' +
        designCustomParams.right_side_bg_color +
        '; }';
    }

    if (typeof (window as any).CUSTOM_LOGO === 'undefined') {
      if (designCustomParams.custom_logo) {
        (window as any).CUSTOM_LOGO = designCustomParams.custom_logo;
      }
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
        head.removeChild(style);
      }
      if (designCustomParams.custom_css_url) {
        head.removeChild(link);
      }
    };
  }, []);
};

export default useDesignCustomization;
