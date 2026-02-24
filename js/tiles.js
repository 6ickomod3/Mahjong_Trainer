// ===== Tile Definitions =====

const SUITS = {
  wan: {
    name: '万', label: 'Characters',
    tiles: [
      { id: 'wan1', char: '一', sub: '万', num: 1 },
      { id: 'wan2', char: '二', sub: '万', num: 2 },
      { id: 'wan3', char: '三', sub: '万', num: 3 },
      { id: 'wan4', char: '四', sub: '万', num: 4 },
      { id: 'wan5', char: '五', sub: '万', num: 5 },
      { id: 'wan6', char: '六', sub: '万', num: 6 },
      { id: 'wan7', char: '七', sub: '万', num: 7 },
      { id: 'wan8', char: '八', sub: '万', num: 8 },
      { id: 'wan9', char: '九', sub: '万', num: 9 },
    ]
  },
  tiao: {
    name: '条', label: 'Bamboo',
    tiles: [
      { id: 'tiao1', char: '一', sub: '条', num: 1 },
      { id: 'tiao2', char: '二', sub: '条', num: 2 },
      { id: 'tiao3', char: '三', sub: '条', num: 3 },
      { id: 'tiao4', char: '四', sub: '条', num: 4 },
      { id: 'tiao5', char: '五', sub: '条', num: 5 },
      { id: 'tiao6', char: '六', sub: '条', num: 6 },
      { id: 'tiao7', char: '七', sub: '条', num: 7 },
      { id: 'tiao8', char: '八', sub: '条', num: 8 },
      { id: 'tiao9', char: '九', sub: '条', num: 9 },
    ]
  },
  bing: {
    name: '饼', label: 'Dots',
    tiles: [
      { id: 'bing1', char: '一', sub: '饼', num: 1 },
      { id: 'bing2', char: '二', sub: '饼', num: 2 },
      { id: 'bing3', char: '三', sub: '饼', num: 3 },
      { id: 'bing4', char: '四', sub: '饼', num: 4 },
      { id: 'bing5', char: '五', sub: '饼', num: 5 },
      { id: 'bing6', char: '六', sub: '饼', num: 6 },
      { id: 'bing7', char: '七', sub: '饼', num: 7 },
      { id: 'bing8', char: '八', sub: '饼', num: 8 },
      { id: 'bing9', char: '九', sub: '饼', num: 9 },
    ]
  }
};

const WINDS = [
  { id: 'feng_dong', char: '東', sub: '', name: '东风' },
  { id: 'feng_nan',  char: '南', sub: '', name: '南风' },
  { id: 'feng_xi',   char: '西', sub: '', name: '西风' },
  { id: 'feng_bei',  char: '北', sub: '', name: '北风' },
];

const DRAGONS = [
  { id: 'jian_zhong', char: '中', sub: '', name: '红中', cssClass: 'jian' },
  { id: 'jian_fa',    char: '發', sub: '', name: '发财', cssClass: 'jian-fa' },
  { id: 'jian_bai',   char: '白', sub: '', name: '白板', cssClass: 'jian-bai' },
];

const COPIES_PER_TILE = 4;
const HAND_SIZE = 14;

// ===== Tile Index Mapping =====
// Indices: wan 0-8, tiao 9-17, bing 18-26, winds 27-30, dragons 31-33

const NUM_CHARS = ['一','二','三','四','五','六','七','八','九'];

function tileToIndex(tile) {
  if (tile.type === 'suit') {
    const off = { wan: 0, tiao: 9, bing: 18 };
    return off[tile.suit] + tile.num - 1;
  }
  if (tile.type === 'wind') {
    return { feng_dong: 27, feng_nan: 28, feng_xi: 29, feng_bei: 30 }[tile.id];
  }
  if (tile.type === 'dragon') {
    return { jian_zhong: 31, jian_fa: 32, jian_bai: 33 }[tile.id];
  }
}

function indexToDisplay(idx) {
  if (idx < 9)  return { char: NUM_CHARS[idx],   sub: '万', suit: 'wan',  type: 'suit' };
  if (idx < 18) return { char: NUM_CHARS[idx-9], sub: '条', suit: 'tiao', type: 'suit' };
  if (idx < 27) return { char: NUM_CHARS[idx-18],sub: '饼', suit: 'bing', type: 'suit' };
  const honors = [
    { char: '東', sub: '', suit: 'feng',    type: 'wind' },
    { char: '南', sub: '', suit: 'feng',    type: 'wind' },
    { char: '西', sub: '', suit: 'feng',    type: 'wind' },
    { char: '北', sub: '', suit: 'feng',    type: 'wind' },
    { char: '中', sub: '',   suit: 'jian',    type: 'dragon' },
    { char: '發', sub: '',   suit: 'jian-fa', type: 'dragon' },
    { char: '白', sub: '',   suit: 'jian-bai',type: 'dragon' },
  ];
  return honors[idx - 27];
}

function indexToName(idx) {
  const d = indexToDisplay(idx);
  if (d.type === 'suit') return d.char + d.sub;
  return d.char;
}

function handToArray(hand) {
  const arr = new Array(34).fill(0);
  for (const tile of hand) arr[tileToIndex(tile)]++;
  return arr;
}
