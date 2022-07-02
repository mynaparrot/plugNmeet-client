window.PLUG_N_MEET_SERVER_URL = 'http://localhost:8080';

// this is helpful for external plugin development where images or other files located
// in other place.
// window.STATIC_ASSETS_PATH = '';

// custom logo. For best, use direct https link
// window.CUSTOM_LOGO = '';

//With Dynacast dynamically pauses video layers that are not being consumed by any subscribers, significantly reducing publishing CPU and bandwidth usage.
window.ENABLE_DYNACAST = true;

//When using simulcast, LiveKit will publish up to three versions of the stream at various resolutions. Client can pickup most appropriate one.
window.ENABLE_SIMULCAST = true;

// Available options: 'vp8' | 'h264' | 'av1' | 'vp9'. Default: vp8
window.VIDEO_CODEC = 'vp8';

// Available options: 'h90' | 'h180' | 'h216' | 'h360' | 'h540' | 'h720' | 'h1080' | 'h1440' | 'h2160'.
// Default: h720
window.DEFAULT_WEBCAM_RESOLUTION = 'h720';

// Available options: 'h360fps3' | 'h720fps5' | 'h720fps15' | 'h1080fps15' | 'h1080fps30'.
// Default: h1080fps15
window.DEFAULT_SCREEN_SHARE_RESOLUTION = 'h1080fps15';

//For local tracks, stop the underlying MediaStreamTrack when the track is muted (or paused) on some platforms, this option is necessary to disable the microphone recording indicator. Note: when this is enabled, and BT devices are connected, they will transition between profiles (e.g. HFP to A2DP) and there will be an audible difference in playback.
window.STOP_MIC_TRACK_ON_MUTE = true;

// Design customization
// in json format
// window.DESIGN_CUSTOMIZATION = `{
//   "primary_color": "#004D90",
//   "secondary_color": "#24AEF7",
//   "background_color": "#0b7db4",
//   "background_image": "https:\/\/mydomain.com\/custom_bg.png",
//   "header_bg_color": "#45b3ec",
//   "footer_bg_color": "#45b3ec",
//   "left_side_bg_color": "#04a2f3",
//   "right_side_bg_color": "#04a2f3",
//   "custom_css_url": "https:\/\/mydomain.com\/plugNmeet_desing.css",
//   "custom_logo": "https:\/\/mydomain.com\/logo.png",
// }`;
