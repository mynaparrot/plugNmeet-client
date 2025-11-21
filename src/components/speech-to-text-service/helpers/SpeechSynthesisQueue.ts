const WAITING = 'WAITING',
  PROCESSING = 'PROCESSING';

class SpeechSynthesisQueue {
  private _isActive: boolean = false;
  private readonly _queue: SpeechSynthesisUtterance[] = [];
  private _state = WAITING;

  /**
   * Adds a new utterance to the queue and starts processing if not already active.
   * @param text The text to be spoken.
   * @param lang The language code for the voice.
   */
  public speak = (text: string, lang: string) => {
    if (!text || !lang) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.8; // Set the speech rate. 1 is default, 0.8 is slower.
    this._queue.push(utterance);

    if (this._state === WAITING) {
      this.processQueue();
    }
  };

  /**
   * Starts the queue processing.
   */
  public start = () => {
    this._isActive = true;
    // If there are items in the queue, start processing immediately.
    if (this._queue.length > 0 && this._state === WAITING) {
      this.processQueue();
    }
  };

  /**
   * Stops all speech, clears the queue, and deactivates the service.
   */
  public stop = () => {
    this._isActive = false;
    this._queue.length = 0; // Clear the array
    window.speechSynthesis.cancel();
  };

  /**
   * The core processing loop.
   * It speaks utterances one by one as long as the service is active.
   */
  private processQueue = () => {
    if (
      this._state === PROCESSING ||
      this._queue.length === 0 ||
      !this._isActive
    ) {
      this._state = WAITING;
      return;
    }
    this._state = PROCESSING;

    const utterance = this._queue[0];

    utterance.onend = () => {
      this._queue.shift(); // Remove the item that just finished
      this._state = WAITING;
      this.processQueue(); // Immediately try to process the next item
    };

    utterance.onerror = (event) => {
      console.error('SpeechSynthesis Error:', event);
      this._queue.shift(); // Also remove on error to prevent getting stuck
      this._state = WAITING;
      this.processQueue();
    };

    window.speechSynthesis.speak(utterance);
  };
}

// Export a singleton instance of the queue.
const speechQueue = new SpeechSynthesisQueue();
export default speechQueue;
