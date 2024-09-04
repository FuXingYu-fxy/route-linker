const code = 'this.$router.push({path: "/abc_fo/123?abd=12"})';


function getFullPath(code, word) {
  let left = code.indexOf(word);
  let right = left + word.length - 1;

  if (left === -1) {
    return closeStr; // 如果没有找到子字符串，返回空数组
  }

  // 向左查找第一个引号
  while (left >= 0 && code[left] !== '"' && code[left] !== "'") {
    left--;
  }

  // 向右查找第一个引号
  while (right < code.length && code[right] !== '"' && code[right] !== "'") {
    right++;
  }

  // 如果找到的引号是成对的，则提取中间的字符串
  if (left >= 0 && right < code.length && code[left] === code[right]) {
    return code.slice(left + 1, right);
  }

  return '';
}

console.log(getFullPath(code, '/123'));




