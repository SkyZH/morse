<template>
<div>
  <button v-on:click="play()">PLAY</button>
</div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { setInterval } from 'timers';
import _ from 'lodash';
import { Recoverable } from 'repl';

const audioCtx: AudioContext = new ((<any>window)['AudioContext']);
const transmissionSpeed = 10;
const receiveDelta = 5;
const fftSize = 4096;
const transmissionFreq = [1046.502, 1318.510, 1567.982, 2093.005, 2637.020, 3135.963, 4186.009]; //[261.6256, 329.6276, 391.9954, 523.2511, 659.2551, 783.9909, 1046.502];
const receiveM = 0.05;

@Component
export default class Morse extends Vue {
  mounted() {
    this.stream();
    
  }

  play() {
    this.playSound(this.generateSound());
  }

  private analyser: AnalyserNode | null = null;
  private dataArray: Float32Array | null = null;

  stream() {
    this.analyser = audioCtx.createAnalyser();
    this.analyser.fftSize = fftSize;
    const bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Float32Array(bufferLength);
    navigator.getUserMedia({ audio: true }, stream => {
      let source = audioCtx.createMediaStreamSource(stream);
      source.connect(this.analyser!);
      setInterval(() => this.analyze(), 1000 / transmissionSpeed / receiveDelta);
    }, err => true)
  }

  private receive_data_cnt = 0;
  private receive_data_time = 0;
  private plays = 0;

  receive(status: Boolean[]) {
    this.receive_data_time++;
    this.receive_data_cnt += _.sum(_.map(status, d => d ? 1 : 0));
    if (this.receive_data_time >= receiveDelta) {
      console.log(this.receive_data_cnt >= receiveDelta * 2);
      this.receive_data_cnt = 0;
      this.receive_data_time = 0;
      this.plays++;
      if (this.plays % 2 == 0) {
        this.plays = 0;
        this.play();
      }
      
    }
  }

  analyze() {
    const freqCount = audioCtx.sampleRate / fftSize;
    this.analyser!.getFloatTimeDomainData(this.dataArray!);
    const recv = _.map(transmissionFreq, freq => 
      Math.abs(this.dataArray![Math.round(freq / freqCount)]) >= receiveM);
    this.receive(recv);
  }

  playSound(buf: Float32Array) {
    let buffer = audioCtx.createBuffer(1, buf.length, audioCtx.sampleRate)
    buffer.copyToChannel(buf, 0)
    let source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.start(0);
  }

  generateSound() {
    let sineWaveAt = (sampleNumber: number, tone: number) => {
      let sampleFreq = audioCtx.sampleRate / tone;
      return Math.sin(sampleNumber / (sampleFreq / (Math.PI*2)));
    }
    let volume = 0.2, seconds = 1.0 / transmissionSpeed * 0.8, tone = transmissionFreq;
    let length = audioCtx.sampleRate * seconds;
    let buf = new Float32Array(length);
    for (var i = 0; i < length; i++) {
      for (let j = 0; j < tone.length; j++) {
        buf[i] += sineWaveAt(i, tone[j]) * volume;
      }
    }
    return buf;
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h3 {
  margin: 40px 0 0;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}
</style>
