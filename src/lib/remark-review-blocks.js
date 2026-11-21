/**
 * remark 플러그인 — ```verdict / ```proscons / ```price 코드 펜스를
 * 리뷰 블록 HTML로 바꿉니다. (md·mdx 공통)
 *
 * astro.config.mjs 에서 마크다운·MDX 두 파이프라인 모두에 등록합니다.
 */
import { isReviewBlock, renderReviewBlock } from './review-blocks.js';

function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node.children)) {
    for (let index = 0; index < node.children.length; index += 1) {
      const child = node.children[index];
      if (visit(child, index, node)) continue;
      walk(child, visit);
    }
  }
}

/**
 * @param {{base?: string}} [options]
 */
export function remarkReviewBlocks(options = {}) {
  const base = options.base || '';

  return (tree) => {
    walk(tree, (node, index, parent) => {
      if (node.type !== 'code' || !isReviewBlock(node.lang)) return false;
      const html = renderReviewBlock(node.lang, node.value, { base });
      if (!html) return false;
      parent.children[index] = { type: 'html', value: html };
      return true;
    });
  };
}

export default remarkReviewBlocks;
