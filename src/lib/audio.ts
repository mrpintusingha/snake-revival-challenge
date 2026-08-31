class SoundEngine {
  private ctx: AudioContext | null = null;
  public enabled = true;

  init() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
  }

  private playTone(freq: number, type: OscillatorType, durationMs: number, vol = 0.1) {
    if (!this.enabled || !this.ctx) return;
    if (this.ctx.state === "suspended") this.ctx.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + durationMs / 1000);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + durationMs / 1000);
  }

  buttonClick() {
    this.playTone(800, "square", 30, 0.05);
  }

  startup() {
    if (!this.enabled || !this.ctx) return;
    if (this.ctx.state === "suspended") this.ctx.resume();

    const play = (f: number, t: number, d: number) => {
      setTimeout(() => this.playTone(f, "square", d, 0.1), t);
    };

    play(880, 0, 150);
    play(1108, 150, 150);
    play(1318, 300, 300);
  }

  eat() {
    this.playTone(1200, "square", 80, 0.08);
  }

  milestone() {
    if (!this.enabled || !this.ctx) return;
    if (this.ctx.state === "suspended") this.ctx.resume();
    
    setTimeout(() => this.playTone(1500, "square", 100, 0.1), 0);
    setTimeout(() => this.playTone(1800, "square", 150, 0.1), 100);
  }

  die() {
    if (!this.enabled || !this.ctx) return;
    if (this.ctx.state === "suspended") this.ctx.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.5);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.5);
  }

  uiClick() {
    this.playTone(600, "sine", 20, 0.05);
  }
}

export const audio = new SoundEngine();

