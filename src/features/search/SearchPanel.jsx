import React from 'react';

// 부스 검색 패널
export default function SearchPanel({
  query,
  results,
  isLoading,
  onChange,
  onSelect,
  onClear,
  onFocus,
}) {
  return (
    <div id="search-panel">
      <div className="search-field">
        <input
          type="text"
          value={query}
          placeholder="부스명 검색"
          onChange={(event) => onChange(event.target.value)}
          onFocus={onFocus}
        />
        <button
          type="button"
          className={`search-clear ${query ? 'visible' : 'hidden'}`}
          onClick={onClear}
          tabIndex={query ? 0 : -1}
          aria-hidden={query ? 'false' : 'true'}
        >
          지우기
        </button>
      </div>
      {isLoading ? <p className="search-status">검색 데이터 로드 중</p> : null}
      {!isLoading && query && results.length === 0 ? (
        <p className="search-status">일치 부스 없음</p>
      ) : null}
      {!isLoading && results.length > 0 ? (
        <div className="search-results">
          {results.map((result) => (
            <button
              key={`${result.boothId}-${result.boothName}`}
              type="button"
              className="search-result-item"
              onClick={() => onSelect(result)}
            >
              <strong>{result.boothName}</strong>
              <span>{result.univName}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
