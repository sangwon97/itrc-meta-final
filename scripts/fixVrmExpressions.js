// VRM 0.x 파일에서 presetName:'unknown' 중복 blendShape 항목을 제거하는 스크립트
// GLB JSON 청크를 직접 수정 후 파일 길이를 재계산해 덮어씁니다.
var fs = require('fs');
var path = require('path');

var files = process.argv.slice(2);
if (files.length === 0) {
  console.error('Usage: node fixVrmExpressions.js <file.vrm> [...]');
  process.exit(1);
}

files.forEach(function (filePath) {
  var buf = fs.readFileSync(filePath);

  // GLB 헤더 검증
  var magic = buf.readUInt32LE(0);
  if (magic !== 0x46546C67) {
    console.log('[skip] not a GLB:', filePath);
    return;
  }

  var jsonChunkLen = buf.readUInt32LE(12);
  var jsonChunkType = buf.readUInt32LE(16);
  if (jsonChunkType !== 0x4E4F534A) { // "JSON"
    console.log('[skip] first chunk is not JSON:', filePath);
    return;
  }

  var jsonStart = 20;
  var jsonEnd = jsonStart + jsonChunkLen;
  var jsonStr = buf.slice(jsonStart, jsonEnd).toString('utf8').replace(/\0+$/, '');
  var json = JSON.parse(jsonStr);

  var vrm = json.extensions && json.extensions.VRM;
  if (!vrm || !vrm.blendShapeMaster) {
    console.log('[skip] no VRM 0.x blendShapeMaster:', filePath);
    return;
  }

  var groups = vrm.blendShapeMaster.blendShapeGroups;
  var before = groups.length;

  // presetName:'unknown' 항목은 첫 번째 하나만 남기고 제거
  // (실제로는 전부 제거해도 NPC 동작에 영향 없음)
  var seenUnknown = false;
  vrm.blendShapeMaster.blendShapeGroups = groups.filter(function (g) {
    if (g.presetName === 'unknown') {
      if (seenUnknown) return false;
      seenUnknown = true;
    }
    return true;
  });

  var after = vrm.blendShapeMaster.blendShapeGroups.length;
  var removed = before - after;

  if (removed === 0) {
    console.log('[ok] no duplicates found:', filePath);
    return;
  }

  // JSON 재직렬화 + 4바이트 정렬 (공백 패딩)
  var newJsonStr = JSON.stringify(json);
  var padLen = (4 - (newJsonStr.length % 4)) % 4;
  var newJsonPadded = newJsonStr + ' '.repeat(padLen);
  var newJsonBuf = Buffer.from(newJsonPadded, 'utf8');

  // 바이너리 청크 (JSON 청크 이후)
  var restBuf = buf.slice(jsonEnd);

  // 새 GLB 조립
  var newBuf = Buffer.alloc(12 + 8 + newJsonBuf.length + restBuf.length);
  // 헤더
  buf.copy(newBuf, 0, 0, 12); // magic + version 유지
  newBuf.writeUInt32LE(newBuf.length, 8); // 전체 파일 길이 갱신
  // JSON 청크 헤더
  newBuf.writeUInt32LE(newJsonBuf.length, 12);
  newBuf.writeUInt32LE(0x4E4F534A, 16);
  // JSON 데이터
  newJsonBuf.copy(newBuf, 20);
  // 나머지 (바이너리 청크)
  restBuf.copy(newBuf, 20 + newJsonBuf.length);

  fs.writeFileSync(filePath, newBuf);
  console.log('[fixed] removed ' + removed + ' unknown entries:', path.basename(filePath));
});
