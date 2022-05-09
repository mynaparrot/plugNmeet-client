import * as tfBodyPix from '@tensorflow-models/body-pix';
import * as tf from '@tensorflow/tfjs';
import { useEffect, useState } from 'react';
let bodyPixStore: tfBodyPix.BodyPix;

function useBodyPix() {
  const [bodyPix, setBodyPix] = useState<tfBodyPix.BodyPix>();

  useEffect(() => {
    async function loadBodyPix() {
      console.log('Loading TensorFlow.js and BodyPix segmentation model');
      await tf.ready();
      bodyPixStore = await tfBodyPix.load();
      setBodyPix(bodyPixStore);
      console.log('TensorFlow.js and BodyPix loaded');
    }
    let timeout;
    if (!bodyPixStore) {
      timeout = setTimeout(() => {
        loadBodyPix();
      }, 500);
    } else {
      setBodyPix(bodyPixStore);
    }
    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, []);

  return bodyPix;
}

export default useBodyPix;
