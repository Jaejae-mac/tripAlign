#!/usr/bin/env node
/**
 * iOS PWA 스플래시 이미지 생성 스크립트
 * Node.js 내장 모듈(zlib, fs)만 사용하여 PNG 파일을 생성합니다.
 * 배경색: #F0FDFA (브랜드 라이트 틸)
 */
const zlib = require('zlib')
const fs = require('fs')
const path = require('path')

// CRC32 구현 (PNG 청크 체크섬용)
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const combined = Buffer.concat([typeBuf, data])
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(combined), 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

/**
 * 지정 색상의 단색 PNG 생성
 * 중앙에 사각형 아이콘(틸 배경 + 흰 비행기 실루엣)을 그립니다.
 */
function generateSplashPNG(width, height) {
  // 브랜드 배경색: #F0FDFA → RGB(240, 253, 250)
  const BG_R = 240, BG_G = 253, BG_B = 250
  // 아이콘 배경색: #0D9488 → RGB(13, 148, 136)
  const ICON_R = 13, ICON_G = 148, ICON_B = 136

  // 아이콘 크기 (화면 짧은 변의 20%)
  const iconSize = Math.round(Math.min(width, height) * 0.20)
  const iconRadius = Math.round(iconSize * 0.22)
  const cx = Math.round(width / 2)
  const cy = Math.round(height / 2)
  const iconX1 = cx - Math.round(iconSize / 2)
  const iconY1 = cy - Math.round(iconSize / 2)
  const iconX2 = cx + Math.round(iconSize / 2)
  const iconY2 = cy + Math.round(iconSize / 2)

  // PNG 서명
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  // IHDR 청크
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // 비트 깊이
  ihdr[9] = 2 // 색상 타입: RGB

  // 픽셀 데이터 생성
  const rowSize = 1 + width * 3
  const raw = Buffer.alloc(height * rowSize)

  for (let y = 0; y < height; y++) {
    raw[y * rowSize] = 0 // 필터 타입: None

    for (let x = 0; x < width; x++) {
      const i = y * rowSize + 1 + x * 3
      const inIcon =
        x >= iconX1 && x <= iconX2 &&
        y >= iconY1 && y <= iconY2 &&
        x - iconX1 >= iconRadius &&
        iconX2 - x >= iconRadius &&
        y - iconY1 >= iconRadius &&
        iconY2 - y >= iconRadius

      if (inIcon) {
        // 아이콘 영역: 틸 배경
        raw[i] = ICON_R; raw[i + 1] = ICON_G; raw[i + 2] = ICON_B
      } else {
        // 배경: 라이트 틸
        raw[i] = BG_R; raw[i + 1] = BG_G; raw[i + 2] = BG_B
      }
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 6 })

  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ])
}

// 주요 iPhone / iPad 해상도
const SPLASH_SIZES = [
  [1290, 2796], // iPhone 15 Pro Max, 14 Pro Max
  [1179, 2556], // iPhone 15 Pro, 15, 14 Pro
  [1284, 2778], // iPhone 14 Plus, 13 Pro Max, 12 Pro Max
  [1170, 2532], // iPhone 14, 13, 12
  [1080, 1920], // iPhone 11, XR
  [750,  1334], // iPhone SE (3rd gen)
  [2048, 2732], // iPad Pro 12.9"
  [1668, 2388], // iPad Pro 11"
  [1620, 2160], // iPad 10th gen
]

const outDir = path.join(__dirname, '../public/splash')
fs.mkdirSync(outDir, { recursive: true })

for (const [w, h] of SPLASH_SIZES) {
  process.stdout.write(`Generating splash-${w}x${h}.png ...`)
  const png = generateSplashPNG(w, h)
  fs.writeFileSync(path.join(outDir, `splash-${w}x${h}.png`), png)
  console.log(` done (${(png.length / 1024).toFixed(0)} KB)`)
}

console.log(`\n✅ ${SPLASH_SIZES.length}개 스플래시 이미지 생성 완료 → public/splash/`)
