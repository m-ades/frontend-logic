const VALUES = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
  [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
  [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
]

export function toRomanNumeral(value) {
  const num = Math.round(Number(value))
  if (!Number.isFinite(num) || num < 1) return String(value)

  let remaining = num
  let result = ''
  for (const [amount, numeral] of VALUES) {
    while (remaining >= amount) {
      result += numeral
      remaining -= amount
    }
  }
  return result
}
