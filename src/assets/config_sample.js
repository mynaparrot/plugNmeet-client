// We'll define a single configuration object.
window.plugNmeetConfig = {
  // The URL of your plugNmeet server.
  serverUrl: 'http://localhost:8080',

  // This is helpful for external plugin development where images or other files are located
  // in another place.
  // staticAssetsPath: '',

  // Custom logos. For best results, use direct HTTPS links.
  /*customLogo: {
    main_logo_light: 'https://mydomain.com/logo_light.png',
    main_logo_dark: 'https://mydomain.com/logo_dark.png',
  },*/

  // AdaptiveStream lets LiveKit automatically manage the quality of subscribed video tracks to optimize for bandwidth and CPU.
  enableAdaptiveStream: true,

  // Dynacast dynamically pauses video layers that are not being consumed by any subscribers,
  // significantly reducing publishing CPU and bandwidth usage.
  enableDynacast: true,

  // When using simulcast, LiveKit will publish up to three versions of the stream at various resolutions.
  // The client can then pick the most appropriate one.
  enableSimulcast: true,

  // Available options: 'vp8' | 'h264' | 'vp9' | 'av1'. Default: 'vp8'.
  videoCodec: 'vp8',

  // Available options: 'h90' | 'h180' | 'h216' | 'h360' | 'h540' | 'h720' | 'h1080' | 'h1440' | 'h2160'.
  // Default: 'h720'.
  defaultWebcamResolution: 'h720',

  // Available options: 'h360fps3' | 'h720fps5' | 'h720fps15' | 'h1080fps15' | 'h1080fps30'.
  // Default: 'h1080fps15'.
  defaultScreenShareResolution: 'h1080fps15',

  // Available options: 'telephone' | 'speech' | 'music' | 'musicStereo' | 'musicHighQuality' | 'musicHighQualityStereo'.
  // Default: 'music'.
  defaultAudioPreset: 'music',

  // For local tracks, stop the underlying MediaStreamTrack when the track is muted (or paused).
  // On some platforms, this option is necessary to disable the microphone recording indicator.
  // Note: When this is enabled and BT devices are connected, they will transition between profiles
  // (e.g., HFP to A2DP), and there will be an audible difference in playback.
  stopMicTrackOnMute: true,

  // If true, the webcam view will be relocated and arranged based on the active speaker.
  // Default: true.
  focusActiveSpeakerWebcam: true,

  // Disables the dark mode theme and the user's ability to toggle it.
  disableDarkMode: false,

  // Design customization in JS Object or JSON format.
  /*designCustomization: {
    primary_color: '#004D90',
    primary_btn_bg_color: '#00a1f28c',
    primary_btn_text_color: '#ffffff',
    secondary_color: '#24AEF7',
    secondary_btn_bg_color: '#ffffff8c',
    secondary_btn_text_color: '#0c131a',
    header_bg_color: '#45b3ec',
    footer_bg_color: '#45b3ec',
    footer_icon_bg_color: '#004d90',
    footer_icon_color: '#ffffff',
    side_panel_bg_color: '#04a2f3',
    background_color: '#0b7db4',
    background_image: 'https://mydomain.com/custom_bg.png',
    custom_css_url: 'https://mydomain.com/plugNmeet_desing.css',
    custom_logo: 'https://mydomain.com/logo.png',
  },*/

  // Whiteboard PreloadedLibraryItems, which should be an array of full library direct URLs.
  // You can get items from here: https://libraries.excalidraw.com
  /*whiteboardPreloadedLibraryItems: [
    'https://libraries.excalidraw.com/libraries/BjoernKW/UML-ER-library.excalidrawlib',
    'https://libraries.excalidraw.com/libraries/aretecode/decision-flow-control.excalidrawlib',
    'https://libraries.excalidraw.com/libraries/dbssticky/data-viz.excalidrawlib',
    'https://libraries.excalidraw.com/libraries/pgilfernandez/basic-shapes.excalidrawlib',
    'https://libraries.excalidraw.com/libraries/ocapraro/bubbles.excalidrawlib',
  ],*/

  // You can set default virtual background images here.
  // Make sure that you're using direct HTTPS links, otherwise the files may not load.
  /*virtualBackgroundImages: [
    'https://www.example.com/vb_bg/image1.png',
    'https://www.example.com/vb_bg/image2.png',
    'https://www.example.com/vb_bg/image3.png',
  ],*/

  // Databases older than this will be cleaned up on startup (in milliseconds).
  // Default: 6 hours.
  // dbMaxAgeMs: 6 * 60 * 60 * 1000,
};
