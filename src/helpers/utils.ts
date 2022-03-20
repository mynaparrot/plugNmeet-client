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

  if (devices.length > 1 && devices[0].deviceId === 'default') {
    // find another device with matching group id, and move that to 0
    const defaultDevice = devices[0];
    for (let i = 1; i < devices.length; i += 1) {
      if (devices[i].groupId === defaultDevice.groupId) {
        const temp = devices[0];
        devices[0] = devices[i];
        devices[i] = temp;
        break;
      }
    }
    return devices.filter((device) => device !== defaultDevice);
  }

  stream.getTracks().forEach(function (track) {
    track.stop();
  });

  return devices;
}

const dec2hex = (dec) => {
  return dec.toString(16).padStart(2, '0');
};

export const randomString = (len = 20) => {
  const arr = new Uint8Array((len || 20) / 2);
  window.crypto.getRandomValues(arr);
  return Array.from(arr, dec2hex).join('');
};

export const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
