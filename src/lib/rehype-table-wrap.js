/**
 * rehype 플러그인 — 본문의 표(<table>)를 스크롤 래퍼로 감쌉니다.
 *
 * 표에 직접 overflow-x 를 걸려고 display:block 을 주면 표 레이아웃이 깨져
 * 칸 너비가 내용만큼 줄어들고, 넓은 화면에서도 표가 잘린 것처럼 보입니다.
 * 그래서 표는 그대로 두고 바깥 div(.table-scroll)만 가로 스크롤을 맡깁니다.
 *
 * astro.config.mjs 의 markdown.processor(rehypePlugins)에 등록하면
 * .md · .mdx 두 파이프라인 모두에 적용됩니다.
 */

const WRAPPER_CLASS = 'table-scroll';

function isElement(node) {
  return Boolean(node) && typeof node === 'object' && node.type === 'element';
}

function hasClass(node, name) {
  const value = node?.properties?.className;
  if (Array.isArray(value)) return value.includes(name);
  return typeof value === 'string' && value.split(/\s+/).includes(name);
}

function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  if (!Array.isArray(node.children)) return;
  for (let index = 0; index < node.children.length; index += 1) {
    const child = node.children[index];
    if (visit(child, index, node)) continue;
    walk(child, visit);
  }
}

export function rehypeTableWrap() {
  return (tree) => {
    walk(tree, (node, index, parent) => {
      if (!isElement(node) || node.tagName !== 'table') return false;
      // 이미 감싼 표는 다시 감싸지 않습니다.
      if (isElement(parent) && hasClass(parent, WRAPPER_CLASS)) return false;
      parent.children[index] = {
        type: 'element',
        tagName: 'div',
        properties: { className: [WRAPPER_CLASS] },
        children: [node],
      };
      return false;
    });
  };
}

export const TABLE_WRAPPER_CLASS = WRAPPER_CLASS;

export default rehypeTableWrap;
