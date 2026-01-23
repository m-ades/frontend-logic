export const PASSWORD_POLICY = {
  minLength: 12,
  minLowercase: 1,
  minUppercase: 1,
  minNumbers: 1,
  minSymbols: 1,
};

export const PASSWORD_POLICY_MESSAGE = `Password must be at least ${PASSWORD_POLICY.minLength} characters and include at least one uppercase letter, one lowercase letter, one number, and one symbol.`;

const countMatches = (value, regex) => (value.match(regex) || []).length;

export function isStrongPassword(password) {
  if (typeof password !== "string") return false;
  if (password.length < PASSWORD_POLICY.minLength) return false;
  if (countMatches(password, /[a-z]/g) < PASSWORD_POLICY.minLowercase) return false;
  if (countMatches(password, /[A-Z]/g) < PASSWORD_POLICY.minUppercase) return false;
  if (countMatches(password, /[0-9]/g) < PASSWORD_POLICY.minNumbers) return false;
  if (countMatches(password, /[^A-Za-z0-9]/g) < PASSWORD_POLICY.minSymbols) return false;
  return true;
}

const LOWERCASE_CHARS = "abcdefghijkmnpqrstuvwxyz";
const UPPERCASE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const NUMBER_CHARS = "23456789";
const SYMBOL_CHARS = "!@#$";
const ALL_CHARS = `${LOWERCASE_CHARS}${UPPERCASE_CHARS}${NUMBER_CHARS}${SYMBOL_CHARS}`;

const getRandomChar = (chars) =>
  chars.charAt(Math.floor(Math.random() * chars.length));

const shuffle = (chars) => {
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars;
};

export function generateStrongPassword(length = PASSWORD_POLICY.minLength) {
  const targetLength = Math.max(length, PASSWORD_POLICY.minLength);
  const required = [
    getRandomChar(LOWERCASE_CHARS),
    getRandomChar(UPPERCASE_CHARS),
    getRandomChar(NUMBER_CHARS),
    getRandomChar(SYMBOL_CHARS),
  ];
  const remaining = Array.from({ length: targetLength - required.length }, () =>
    getRandomChar(ALL_CHARS)
  );
  return shuffle([...required, ...remaining]).join("");
}
