/**
 * ClearPop Audio Manager
 *
 * Plays gameplay event sounds via a SoundBank. The bank is supplied at
 * construction time so variants can swap audio without touching this class.
 */

import type { AudioLoader } from '~/core/systems/assets/loaders/audio';
import { BaseAudioManager } from '~/core/systems/audio';
import type { SoundBank } from './sound-bank';
import { EIGENPOP_SOUND_BANK } from './sound-bank';

export class GameAudioManager extends BaseAudioManager {
  private bank: SoundBank;

  constructor(audioLoader: AudioLoader, bank: SoundBank = EIGENPOP_SOUND_BANK) {
    super(audioLoader);
    this.bank = bank;
  }

  startGameMusic(): void { this.startMusic(this.bank.music.game); }
  stopGameMusic(): void { this.stopMusic(); }

  playButtonClick():     void { this.playSound(this.bank.sfx.buttonClick); }
  playPop():             void { this.playSound(this.bank.sfx.pop); }
  playReject():          void { this.playSound(this.bank.sfx.reject); }
  playBlockerHit():      void { this.playSound(this.bank.sfx.blockerHit); }
  playBlockerClear():    void { this.playSound(this.bank.sfx.blockerClear); }
  playPowerUpSpawn():    void { this.playSound(this.bank.sfx.powerUpSpawn); }
  playRocket():          void { this.playSound(this.bank.sfx.rocket); }
  playBomb():            void { this.playSound(this.bank.sfx.bomb); }
  playColorBlast():      void { this.playSound(this.bank.sfx.colorBlast); }
  playCombo():           void { this.playSound(this.bank.sfx.combo); }
  playWin():             void { this.playSound(this.bank.sfx.win); }
  playLose():            void { this.playSound(this.bank.sfx.lose); }
  playMarshmallowBurn(): void { this.playSound(this.bank.sfx.marshmallowBurn); }
}
