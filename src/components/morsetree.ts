import _ from 'lodash';

const morseCode = [
  '.-', '-...', '-.-.', '-..', '.', '..-.', '--.', '....',
  '..', '.---', '-.-', '.-..', '--', '-.', '---', '.--.',
  '--.-', '.-.', '...', '-', '..-', '...-', '.--', '-..-',
  '-.--', '--..'
];
const abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

interface Node {
  data: string | null;
  children: any;
}

let root: Node;

const add = (code: string, result: string) => {
  let cur = root;
  for (let i = 0; i < code.length; i++) {
    let c = code[i];
    if (!(c in cur.children)) {
      cur.children[c] = { data: null, children: {} };
    }
    cur = cur.children[c];
  }
  cur.data = result;
}

const init = () => {
  root = { data: null, children: {} };
  for (let i = 0; i < morseCode.length; i++) {
    add(morseCode[i], abc[i]);
  }
}

init();

export const MorseQuery = (data: number[]) => {
  const transform = ['.', '-'];
  let cur = root;
  let result = "";
  for (let i = 0; i < data.length; i++) {
    if (data[i] == 5) {
      result += cur.data;
      cur = root;
    } else if (data[i] == 0 || data[i] == 1) {
      cur = cur.children[transform[data[i]]];
    }
  }
  return result;
}

export const MorseBuild = (data: string) => {
  let result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    let charCode = data.charCodeAt(i);
    result = result.concat(_.map(morseCode[charCode - 65], c => c == '.' ? 0 : 1));
    result.push(5);
  }
  return result;
}