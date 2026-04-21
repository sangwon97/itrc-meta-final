const CHOSUNG = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const CHOSUNG_SET = new Set(CHOSUNG);

/** 한글 음절 문자열에서 초성만 추출. 비한글 문자는 그대로 유지. */
export function getChosung(text) {
  return Array.from(String(text)).map((char) => {
    const code = char.charCodeAt(0) - 0xAC00;
    if (code < 0 || code > 11171) return char;
    return CHOSUNG[Math.floor(code / 28 / 21)];
  }).join('');
}

/** 쿼리가 한글 자음으로만 이루어진 초성 쿼리인지 여부 */
export function isChosungQuery(query) {
  return query.length > 0 && Array.from(query).every((char) => CHOSUNG_SET.has(char));
}

/** text가 query를 포함하는지 검사 (일반 포함 + 초성 검색 동시 지원) */
export function matchesQuery(text, query) {
  const str = String(text || '');
  if (str.toLowerCase().includes(query)) return true;
  if (isChosungQuery(query)) return getChosung(str).includes(query);
  return false;
}
