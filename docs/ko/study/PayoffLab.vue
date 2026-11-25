<script setup>
import { computed, ref } from 'vue'

const position = ref('call')
const mode = ref('expiry')
const spot = ref(105)
const days = ref(14)
const iv = ref(25)
const isSpread = computed(() => position.value === 'spread')
const debit = computed(() => isSpread.value ? 1.8 : 3)
const beforeExpiry = computed(() => mode.value === 'model')

function normalCdf(value) {
  const magnitude = Math.abs(value)
  const t = 1 / (1 + 0.2316419 * magnitude)
  const tail = Math.exp(-(magnitude ** 2) / 2) / Math.sqrt(2 * Math.PI)
    * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937
    + t * (-1.821255978 + t * 1.330274429))))
  return value < 0 ? tail : 1 - tail
}

function callValue(price, strike, time, volatility) {
  const deviation = volatility * Math.sqrt(time)
  const d1 = Math.log(price / strike) / deviation + deviation / 2
  return price * normalCdf(d1) - strike * normalCdf(d1 - deviation)
}

function profit(price, useModel) {
  const time = days.value / 365
  const volatility = iv.value / 100
  const intrinsic = strike => Math.max(price - strike, 0)
  const value = useModel
    ? strike => callValue(price, strike, time, volatility)
    : intrinsic
  return (value(100) - (isSpread.value ? value(105) : 0) - debit.value) * 100
}

const x = price => 48 + (price - 85) * 11.2
const y = amount => 16 + (1300 - amount) * 0.102
const prices = Array.from({ length: 121 }, (_, index) => 85 + index / 4)
const line = useModel => prices.map(price => `${x(price)},${y(profit(price, useModel))}`).join(' ')
const expiryLine = computed(() => line(false))
const modelLine = computed(() => beforeExpiry.value ? line(true) : '')
const current = computed(() => profit(spot.value, beforeExpiry.value))
const expiry = computed(() => profit(spot.value, false))

function dollars(value) {
  const rounded = Math.round(Math.abs(value) * 100) / 100
  const sign = rounded === 0 ? '' : value < 0 ? '−' : '+'
  return `${sign}$${rounded.toFixed(2)}`
}
</script>

<template>
  <section class="payoff-lab" aria-label="옵션 손익 실습">
    <p class="lab-title">옵션 손익 실습</p>
    <div class="selectors">
      <label>포지션
        <select v-model="position">
          <option value="call">$100 콜 매수</option>
          <option value="spread">$100/$105 콜 스프레드</option>
        </select>
      </label>
      <label>평가 시점
        <select v-model="mode">
          <option value="expiry">만기</option>
          <option value="model">만기 전과 만기 비교</option>
        </select>
      </label>
    </div>
    <label class="slider">기초자산 가격 <strong>${{ spot.toFixed(2) }}</strong>
      <input v-model.number="spot" type="range" min="85" max="115" step="0.1">
    </label>
    <div v-if="beforeExpiry" class="selectors">
      <label class="slider">잔존일 <strong>{{ days }}일</strong>
        <input v-model.number="days" type="range" min="1" max="30">
      </label>
      <label class="slider">내재변동성 <strong>{{ iv }}%</strong>
        <input v-model.number="iv" type="range" min="5" max="70">
      </label>
    </div>
    <p class="result" aria-live="polite">
      {{ beforeExpiry ? '만기 전 모델 손익' : '만기 손익' }}
      <strong>{{ dollars(current) }}</strong>
      <span v-if="beforeExpiry"> · 같은 가격의 만기 손익 {{ dollars(expiry) }}</span>
    </p>
    <svg viewBox="0 0 400 224" role="img" aria-label="기초자산 가격에 따른 계약당 손익 곡선">
      <text x="5" y="13">손익 ($)</text>
      <line v-for="tick in [-300, 0, 500, 1000]" :key="tick" x1="48" x2="384"
        :y1="y(tick)" :y2="y(tick)" :class="tick === 0 ? 'zero' : 'grid'" />
      <text v-for="tick in [-300, 0, 500, 1000]" :key="tick" x="43" :y="y(tick) + 4"
        text-anchor="end">{{ tick }}</text>
      <text v-for="tick in [85, 95, 105, 115]" :key="tick" :x="x(tick)" y="198"
        text-anchor="middle">{{ tick }}</text>
      <text x="216" y="218" text-anchor="middle">기초자산 가격 ($)</text>
      <polyline :points="expiryLine" class="expiry-line" />
      <polyline v-if="beforeExpiry" :points="modelLine" class="model-line" />
      <circle :cx="x(spot)" :cy="y(current)" r="4" class="marker" />
    </svg>
    <p v-if="beforeExpiry" class="note">
      실선은 만기, 점선은 만기 전입니다. 이론가격은 무배당·금리 0%의 유럽식
      Black–Scholes 모델이며 두 행사가에 같은 IV를 적용합니다.
    </p>
    <p class="note">계약당 달러 손익입니다. 수수료와 실제 체결 시 호가 차이는 따로 계산합니다.</p>
  </section>
</template>

<style scoped>
.payoff-lab {
  --ink: #2148b8;
  padding: clamp(12px, 3vw, 24px);
  border: 1px solid var(--vp-c-divider);
  border-top: 3px solid var(--ink);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

:global(.dark) .payoff-lab { --ink: #9ab5ff; }
.lab-title { color: var(--ink); font-size: 1.125rem; font-weight: 700; }
.selectors { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr)); gap: 10px; }
label { display: block; font-size: .9375rem; font-weight: 600; }
select { display: block; width: 100%; min-height: 42px; padding: 4px 8px; border: 1px solid var(--vp-c-text-2); border-radius: 4px; background: var(--vp-c-bg); color: var(--vp-c-text-1); }
.slider { margin-top: 12px; }
input[type="range"] { display: block; width: 100%; min-height: 28px; accent-color: var(--ink); }
.payoff-lab :focus-visible { outline: 2px solid var(--ink); outline-offset: 3px; }
.result { font-variant-numeric: tabular-nums; }
.result strong { color: var(--ink); font-size: 1.125rem; }
svg { display: block; width: 100%; max-width: 520px; margin-inline: auto; }
svg text { fill: var(--vp-c-text-1); font-size: 12px; }
.grid { stroke: var(--vp-c-divider); }
.zero { stroke: var(--vp-c-text-2); }
.expiry-line, .model-line { fill: none; stroke: var(--ink); stroke-width: 2.5; }
.model-line { stroke-dasharray: 5 4; }
.marker { fill: var(--ink); stroke: var(--vp-c-bg); stroke-width: 1.5; }
.note { color: var(--vp-c-text-2); font-size: .875rem; }
</style>
