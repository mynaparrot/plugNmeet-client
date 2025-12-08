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

  // Design customization in JS Object or JSON format.
  /*designCustomization: {
    primary_color: '#004D90',
    secondary_color: '#24AEF7',
    background_color: '#0b7db4',
    background_image: 'https://mydomain.com/custom_bg.png',
    header_bg_color: '#45b3ec',
    footer_bg_color: '#45b3ec',
    left_side_bg_color: '#04a2f3',
    right_side_bg_color: '#04a2f3',
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

// For backward compatibility, we'll populate the old window variables
// from our new configuration object.
// This section can be removed in a future major release.
window.PLUG_N_MEET_SERVER_URL = window.plugNmeetConfig.serverUrl;
window.STATIC_ASSETS_PATH = window.plugNmeetConfig.staticAssetsPath;
window.CUSTOM_LOGO = window.plugNmeetConfig.customLogo;
window.ENABLE_DYNACAST = window.plugNmeetConfig.enableDynacast;
window.ENABLE_SIMULCAST = window.plugNmeetConfig.enableSimulcast;
window.VIDEO_CODEC = window.plugNmeetConfig.videoCodec;
window.DEFAULT_WEBCAM_RESOLUTION =
  window.plugNmeetConfig.defaultWebcamResolution;
window.DEFAULT_SCREEN_SHARE_RESOLUTION =
  window.plugNmeetConfig.defaultScreenShareResolution;
window.DEFAULT_AUDIO_PRESET = window.plugNmeetConfig.defaultAudioPreset;
window.STOP_MIC_TRACK_ON_MUTE = window.plugNmeetConfig.stopMicTrackOnMute;
window.FOCUS_ACTIVE_SPEAKER_WEBCAM =
  window.plugNmeetConfig.focusActiveSpeakerWebcam;
window.DESIGN_CUSTOMIZATION = window.plugNmeetConfig.designCustomization;
window.WHITEBOARD_PRELOADED_LIBRARY_ITEMS =
  window.plugNmeetConfig.whiteboardPreloadedLibraryItems;
window.PNM_VIRTUAL_BG_IMGS = window.plugNmeetConfig.virtualBackgroundImages;
