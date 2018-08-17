<template>
<div class="container">
  <div class="row justify-content-center">
    <div class="col-sm-6">
      <input class="form-control" v-model="text">
      <button class="btn btn-primary btn-block m-1" v-on:click="test_transmit()">Transmit</button>
      <button class="btn btn-primary btn-block m-1" v-on:click="query()">Read</button>
      <button class="btn btn-primary btn-block m-1" v-on:click="clear()">Clear</button>
    </div>
  </div>
  
  <div class="row">
    <div class="col">
      <div v-for="(data, index) in data" :key="index" class="morse"
      :class="{ 'dit': data == 0, 'dah': data == 1, 'invalid': data == 2, 'blank': data == 5 }"></div>
    </div>
  </div>
  <div class="row">
    <div class="col">
      {{ result }}
    </div>
  </div>
</div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { setInterval, clearInterval } from 'timers';
import _ from 'lodash';
import { Recoverable } from 'repl';
import { MorseQuery, MorseBuild } from './morsetree';

const audioCtx: AudioContext = new ((<any>window)['AudioContext'] || (<any>window)['webkitAudioContext']);
const transmissionSpeed = 10;
const receiveDelta = 5;
const fftSize = 4096;
const transmissionFreq = [1046.502, 1318.510, 1567.982, 2093.005, 261.6256, 329.6276, 391.9954, 523.2511];
// [1046.502, 1318.510, 1567.982, 2093.005, 2637.020, 3135.963, 4186.009]; 
//[261.6256, 329.6276, 391.9954, 523.2511, 659.2551, 783.9909, 1046.502];
const receiveM = 0.02;

@Component
export default class Morse extends Vue {
  private analyser: AnalyserNode | null = null;
  private dataArray: Float32Array | null = null;

  mounted() {
    this.stream();
  }

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

  result: string = "";
  text: string = "";

  test_transmit() {
    this.transmit(MorseBuild(this.text));
  }
  
  clear() {
    this.data = [];
  }

  query() {
    this.result = MorseQuery(this.data.concat([5]));
  }

  transmit(data: number[]) {
    let _cnt = 0;
    let _tick = 0;
    const do_transmit = () => {
      _tick--;
      if (_tick <= 0) {
        if (data[_cnt] == 0) {
          this.playSound(this.generateSound(1));
          _tick = 1 + 1;
        }
        if (data[_cnt] == 1) {
          this.playSound(this.generateSound(3));
          _tick = 3 + 1;
        }
        if (data[_cnt] == 5) {
          _tick = 1;
        }
        _cnt++;
        if (_cnt >= data.length) clearInterval(interval);
      }
    }
    let interval = setInterval(() => do_transmit(), 1000 / transmissionSpeed);
  }

  private data: number[] = [];

  private continue_block: number = 0;
  private c_status: number = -1;

  receive(status: Boolean[]) {
    this.receive_data_time++;
    this.receive_data_cnt += _.sum(_.map(status, d => d ? 1 : 0));
    if (this.receive_data_time >= receiveDelta) {
      const on = (this.receive_data_cnt >= receiveDelta * transmissionFreq.length / 2 - 2) ? 1 : 0;
      this.receive_data_cnt = 0;
      this.receive_data_time = 0;
      if (this.c_status != on) {
        if (this.c_status == 1) {
          if (this.continue_block == 1) {
            this.data.push(0);
          } else if (this.continue_block == 3) {
            this.data.push(1);
          } else this.data.push(2);
        } else if (this.c_status == 0) {
          if (this.continue_block == 2) {
            this.data.push(5);
          }
        }
        this.continue_block = 1;
        this.c_status = on;
      } else {
        this.continue_block++;
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

  fn(data: number) {
    const e = 10.0;
    if (data < 0) return -Math.pow(-data, e);
    else return Math.pow(data, e);
  }

  generateSound(block: number) {
    let sineWaveAt = (sampleNumber: number, tone: number) => {
      let sampleFreq = audioCtx.sampleRate / tone;
      return Math.sin(sampleNumber / (sampleFreq / (Math.PI*2)));
    }
    let volume = 1.0 / transmissionFreq.length, seconds = 1.0 / transmissionSpeed * block, tone = transmissionFreq;
    let length = audioCtx.sampleRate * (seconds - 1.0 / transmissionSpeed / 10);
    let buf = new Float32Array(length);
    for (var i = 0; i < length; i++) {
      for (let j = 0; j < tone.length; j++) {
        buf[i] += this.fn(sineWaveAt(i, tone[j])) * volume;
      }
    }
    return buf;
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
  .morse {
    display: inline-block;
    background-color: black;
    height: 0.5rem;
    margin: 0.1rem;
  }
  .dit {
    width: 1rem;
  }
  .dah {
    width: 3rem;
  }
  .invalid {
    width: 1rem;
    background-color: red;
  }
  .blank {
    width: 1rem;
    background-color: white;
    border-color: black;
  }
</style>
