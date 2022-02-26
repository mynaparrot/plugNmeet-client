window.PLUG_N_MEET_SERVER_URL = 'http://localhost:8080';
window.LIVEKIT_SERVER_URL = 'http://localhost:7880';

// this is helpful for external plugin development where images or other files located
// in other place.
// window.STATIC_ASSETS_PATH = '';

// custom logo. For best, use direct https link
// window.CUSTOM_LOGO = '';

//With Dynacast dynamically pauses video layers that are not being consumed by any subscribers, significantly reducing publishing CPU and bandwidth usage.
Window.ENABLE_DYNACAST = true;

//When using simulcast, LiveKit will publish up to three versions of the stream at various resolutions. Client can pickup most appropriate one.
window.ENABLE_SIMULCAST = true;

//For local tracks, stop the underlying MediaStreamTrack when the track is muted (or paused) on some platforms, this option is necessary to disable the microphone recording indicator. Note: when this is enabled, and BT devices are connected, they will transition between profiles (e.g. HFP to A2DP) and there will be an audible difference in playback.
window.STOP_MIC_TRACK_ON_MUTE = true;

// you can set the number of webcams per page for PC. Default 25
window.NUMBER_OF_WEBCAMS_PER_PAGE_PC = 25;
// for mobile
window.NUMBER_OF_WEBCAMS_PER_PAGE_MOBILE = 6;
