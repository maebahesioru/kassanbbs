import crypto from "crypto";

const SALT_CHARS = "./0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

const desCrypt = (key: string, salt: string): string => {
  const keyBytes = Buffer.from(key, "utf-8");
  const keyBits: number[] = [];

  for (let i = 0; i < keyBytes.length * 8; i++) {
    const byteIdx = Math.floor(i / 8);
    const bitIdx = 7 - (i % 8);
    keyBits.push((keyBytes[byteIdx] >> bitIdx) & 1);
  }

  while (keyBits.length < 66) keyBits.push(0);

  const permutedChoice1: number[] = [
    56, 48, 40, 32, 24, 16, 8, 0, 57, 49, 41, 33, 25, 17,
    9, 1, 58, 50, 42, 34, 26, 18, 10, 2, 59, 51, 43, 35,
    62, 54, 46, 38, 30, 22, 14, 6, 61, 53, 45, 37, 29, 21,
    13, 5, 60, 52, 44, 36, 28, 20, 12, 4, 27, 19, 11, 3,
  ];

  const c0: number[] = [];
  const d0: number[] = [];
  for (let i = 0; i < 28; i++) c0.push(keyBits[permutedChoice1[i]]);
  for (let i = 0; i < 28; i++) d0.push(keyBits[permutedChoice1[i + 28]]);

  const shifts = [1, 1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1];
  const permutedChoice2: number[] = [
    13, 16, 10, 23, 0, 4, 2, 27, 14, 5, 20, 9,
    22, 18, 11, 3, 25, 7, 15, 6, 26, 19, 12, 1,
    40, 51, 30, 36, 46, 54, 29, 39, 50, 44, 32, 47,
    43, 48, 38, 55, 33, 52, 45, 41, 49, 35, 28, 31,
  ];

  const subKeys: number[][] = [];
  let c = [...c0];
  let d = [...d0];

  for (let round = 0; round < 16; round++) {
    const shift = shifts[round];
    c = [...c.slice(shift), ...c.slice(0, shift)];
    d = [...d.slice(shift), ...d.slice(0, shift)];
    const cd = [...c, ...d];
    const subKey: number[] = [];
    for (let i = 0; i < 48; i++) subKey.push(cd[permutedChoice2[i]]);
    subKeys.push(subKey);
  }

  const saltValue = SALT_CHARS.indexOf(salt[0]) * 64 + SALT_CHARS.indexOf(salt[1]);
  const saltBits: number[] = [];
  for (let i = 0; i < 12; i++) saltBits.push((saltValue >> (11 - i)) & 1);

  const ip: number[] = [
    57, 49, 41, 33, 25, 17, 9, 1,
    59, 51, 43, 35, 27, 19, 11, 3,
    61, 53, 45, 37, 29, 21, 13, 5,
    63, 55, 47, 39, 31, 23, 15, 7,
    56, 48, 40, 32, 24, 16, 8, 0,
    58, 50, 42, 34, 26, 18, 10, 2,
    60, 52, 44, 36, 28, 20, 12, 4,
    62, 54, 46, 38, 30, 22, 14, 6,
  ];

  const eBitSelection: number[] = [
    31, 0, 1, 2, 3, 4, 3, 4, 5, 6, 7, 8,
    7, 8, 9, 10, 11, 12, 11, 12, 13, 14, 15, 16,
    15, 16, 17, 18, 19, 20, 19, 20, 21, 22, 23, 24,
    23, 24, 25, 26, 27, 28, 27, 28, 29, 30, 31, 0,
  ];

  const sBoxes: number[][][] = [
    [
      [14, 4, 13, 1, 2, 15, 11, 8, 3, 10, 6, 12, 5, 9, 0, 7],
      [0, 15, 7, 4, 14, 2, 13, 1, 10, 6, 12, 11, 9, 5, 3, 8],
      [4, 1, 14, 8, 13, 6, 2, 11, 15, 12, 9, 7, 3, 10, 5, 0],
      [15, 12, 8, 2, 4, 9, 1, 7, 5, 11, 3, 14, 10, 0, 6, 13],
    ],
    [
      [15, 1, 8, 14, 6, 11, 3, 4, 9, 7, 2, 13, 12, 0, 5, 10],
      [3, 13, 4, 7, 15, 2, 8, 14, 12, 0, 1, 10, 6, 9, 11, 5],
      [0, 14, 7, 11, 10, 4, 13, 1, 5, 8, 12, 6, 9, 3, 2, 15],
      [13, 8, 10, 1, 3, 15, 4, 2, 11, 6, 7, 12, 0, 5, 14, 9],
    ],
    [
      [10, 0, 9, 14, 6, 3, 15, 5, 1, 13, 12, 7, 11, 4, 2, 8],
      [13, 7, 0, 9, 3, 4, 6, 10, 2, 8, 5, 14, 12, 11, 15, 1],
      [13, 6, 4, 9, 8, 15, 3, 0, 11, 1, 2, 12, 5, 10, 14, 7],
      [1, 10, 13, 0, 6, 9, 8, 7, 4, 15, 14, 3, 11, 5, 2, 12],
    ],
    [
      [7, 13, 14, 3, 0, 6, 9, 10, 1, 2, 8, 5, 11, 12, 4, 15],
      [13, 8, 11, 5, 6, 15, 0, 3, 4, 7, 2, 12, 1, 10, 14, 9],
      [10, 6, 9, 0, 12, 11, 7, 13, 15, 1, 3, 14, 5, 2, 8, 4],
      [3, 15, 0, 6, 10, 1, 13, 8, 9, 4, 5, 11, 12, 7, 2, 14],
    ],
    [
      [2, 12, 4, 1, 7, 10, 11, 6, 8, 5, 3, 15, 13, 0, 14, 9],
      [14, 11, 2, 12, 4, 7, 13, 1, 5, 0, 15, 10, 3, 9, 8, 6],
      [4, 2, 1, 11, 10, 13, 7, 8, 15, 9, 12, 5, 6, 3, 0, 14],
      [11, 8, 12, 7, 1, 14, 2, 13, 6, 15, 0, 9, 10, 4, 5, 3],
    ],
    [
      [12, 1, 10, 15, 9, 2, 6, 8, 0, 13, 3, 4, 14, 7, 5, 11],
      [10, 15, 4, 2, 7, 12, 9, 5, 6, 1, 13, 14, 0, 11, 3, 8],
      [9, 14, 15, 5, 2, 8, 12, 3, 7, 0, 4, 10, 1, 13, 11, 6],
      [4, 3, 2, 12, 9, 5, 15, 10, 11, 14, 1, 7, 6, 0, 8, 13],
    ],
    [
      [4, 11, 2, 14, 15, 0, 8, 13, 3, 12, 9, 7, 5, 10, 6, 1],
      [13, 0, 11, 7, 4, 9, 1, 10, 14, 3, 5, 12, 2, 15, 8, 6],
      [1, 4, 11, 13, 12, 3, 7, 14, 10, 15, 6, 8, 0, 5, 9, 2],
      [6, 11, 13, 8, 1, 4, 10, 7, 9, 5, 0, 15, 14, 2, 3, 12],
    ],
    [
      [13, 2, 8, 4, 6, 15, 11, 1, 10, 9, 3, 14, 5, 0, 12, 7],
      [1, 15, 13, 8, 10, 3, 7, 4, 12, 5, 6, 11, 0, 14, 9, 2],
      [7, 11, 4, 1, 9, 12, 14, 2, 0, 6, 10, 13, 15, 3, 5, 8],
      [2, 1, 14, 7, 4, 10, 8, 13, 15, 12, 9, 0, 3, 5, 6, 11],
    ],
  ];

  const pPermutation: number[] = [
    15, 6, 19, 20, 28, 11, 27, 16,
    0, 14, 22, 25, 4, 17, 30, 9,
    1, 7, 23, 13, 31, 26, 2, 8,
    18, 12, 29, 5, 21, 10, 3, 24,
  ];

  const fp: number[] = [
    39, 7, 47, 15, 55, 23, 63, 31,
    38, 6, 46, 14, 54, 22, 62, 30,
    37, 5, 45, 13, 53, 21, 61, 29,
    36, 4, 44, 12, 52, 20, 60, 28,
    35, 3, 43, 11, 51, 19, 59, 27,
    34, 2, 42, 10, 50, 18, 58, 26,
    33, 1, 41, 9, 49, 17, 57, 25,
    32, 0, 40, 8, 48, 16, 56, 24,
  ];

  let block = [...keyBits.slice(0, 64)];
  const permutedBlock: number[] = [];
  for (let i = 0; i < 64; i++) permutedBlock.push(block[ip[i]]);

  let l = permutedBlock.slice(0, 32);
  let r = permutedBlock.slice(32, 64);

  for (let round = 0; round < 16; round++) {
    const expanded: number[] = [];
    for (let i = 0; i < 48; i++) expanded.push(r[eBitSelection[i]]);

    const xored: number[] = [];
    let effectiveRound: number;
    if (saltBits[round % 12] === 1) {
      effectiveRound = 15 - round;
    } else {
      effectiveRound = round;
    }
    for (let i = 0; i < 48; i++) xored.push(expanded[i] ^ subKeys[effectiveRound][i]);

    let sOut = 0;
    for (let box = 0; box < 8; box++) {
      const bits = xored.slice(box * 6, (box + 1) * 6);
      const row = (bits[0] << 1) | bits[5];
      const col = (bits[1] << 3) | (bits[2] << 2) | (bits[3] << 1) | bits[4];
      sOut = (sOut << 4) | sBoxes[box][row][col];
    }

    const sBits: number[] = [];
    for (let i = 31; i >= 0; i--) sBits.push((sOut >> i) & 1);

    const pOut: number[] = [];
    for (let i = 0; i < 32; i++) pOut.push(sBits[pPermutation[i]]);

    const newR: number[] = [];
    for (let i = 0; i < 32; i++) newR.push(l[i] ^ pOut[i]);

    l = r;
    r = newR;
  }

  const combined = [...r, ...l];
  const finalBlock: number[] = [];
  for (let i = 0; i < 64; i++) finalBlock.push(combined[fp[i]]);

  const resultChars: string[] = [salt[0], salt[1]];
  for (let i = 0; i < 11; i++) {
    let value = 0;
    for (let j = 0; j < 6; j++) {
      value = (value << 1) | (finalBlock[i * 6 + j] || 0);
    }
    resultChars.push(SALT_CHARS[value]);
  }

  return resultChars.join("");
};

const remove80Problem = (key: string): string => {
  const bytes = Buffer.from(key, "binary");
  const idx = bytes.indexOf(0x80);
  if (idx !== -1) {
    return Buffer.from(bytes.subarray(0, idx)).toString("binary");
  }
  return key;
};

export const generateTrip = (key: string, column: number = 10, useShaTrip: boolean = false): string => {
  if (!key) return "";

  const encodedKey = Buffer.from(key, "utf-8").toString("binary");

  if (encodedKey.length >= 12) {
    const mark = encodedKey[0];

    if (mark === "#" || mark === "$") {
      const rawMatch = encodedKey.match(/^#([0-9a-fA-F]{16})([./0-9A-Za-z]{0,2})$/);
      if (rawMatch) {
        const hex = rawMatch[1].toLowerCase();
        const rawKey = Buffer.from(hex, "hex").toString("binary");
        const cleanedKey = remove80Problem(rawKey);
        const saltRaw = (rawMatch[2] + "..").substring(0, 2);
        const trip = desCrypt(cleanedKey, saltRaw);
        const negColumn = column * -1;
        return trip.substring(trip.length + negColumn);
      }
      return "???";
    }

    if (useShaTrip) {
      const sha1Hash = crypto.createHash("sha1").update(encodedKey, "binary").digest("base64");
      const trip = sha1Hash.substring(0, 12).replace(/\+/g, ".");
      return trip;
    }
  }

  let salt = encodedKey.substring(1, 2);
  if (!salt) salt = "";
  salt += "H.";
  salt = salt.replace(/[^\.-z]/g, ".");
  salt = salt.replace(/[:;<=>?@[\\\]^_`]/g, (ch: string) => {
    const map: Record<string, string> = {
      ":": "A", ";": "B", "<": "C", "=": "D", ">": "E", "?": "F",
      "@": "G", "[": "H", "\\": "I", "]": "J", "^": "K", "_": "L",
      "`": "M",
    };
    return map[ch] || ".";
  });

  salt = salt.replace(/[^./0-9A-Za-z]/g, ".");

  const cleanedKey = remove80Problem(encodedKey);
  const trip = desCrypt(cleanedKey, salt);
  const negColumn = column * -1;
  const result = trip.substring(trip.length + negColumn);
  return result;
};
