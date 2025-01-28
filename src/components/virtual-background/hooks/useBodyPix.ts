import * as tfBodyPix from '@tensorflow-models/body-pix';
import * as tf from '@tensorflow/tfjs';
import { useEffect, useState } from 'react';
import { useAppSelector } from '../../../store';

let bodyPixStore: tfBodyPix.BodyPix;

function useBodyPix() {
  const [bodyPix, setBodyPix] = useState<tfBodyPix.BodyPix>();
  const isRecorder = useAppSelector(
    (state) => state.session.currentUser?.isRecorder,
  );

  useEffect(() => {
    if (isRecorder) {
      return;
    }

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
  }, [isRecorder]);

  return bodyPix;
}

export default useBodyPix;
