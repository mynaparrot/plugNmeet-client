export async function getDevices(kind: MediaDeviceKind) {
  let constraints: MediaStreamConstraints = {
    audio: true,
  };
  if (kind === 'videoinput') {
    constraints = {
      video: true,
    };
  }
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  let devices = await navigator.mediaDevices.enumerateDevices();
  devices = devices.filter((device) => device.kind === kind);

  stream.getTracks().forEach(function (track) {
    track.stop();
  });

  return devices;
}
