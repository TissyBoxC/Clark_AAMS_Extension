/*
 * 内容脚本：在教务系统页面里找出课表，把它交给扩展。
 *
 * 为什么要找「课表区域」而不是直接传 document.documentElement.outerHTML：
 * 教务系统的页面框架、导航、脚本全塞进去会让后端解析器分不清哪块是课表，
 * 而且体积能到几兆。这里按常见容器特征定位到课表本身，再交出去。
 */

/** 课表容器的常见特征，按可靠性排序。 */
const TABLE_HINTS = [
  '#Table1', // 正方教务系统课表页的固定 id
  '.Nsb_r_list', // 正方新版课表列表
  '#kbcontent',
  'table.table_border',
  '.timetable',
  '#timetable',
];

/** 表头里出现这些字，基本可以确认是课表。 */
const HEADER_HINTS = ['星期一', '周一', '节次', '时间'];

/**
 * 找出页面上最像课表的那张表。
 *
 * 先用已知特征找；都没有时退回到「按表头文字找」——
 * 不同学校的模板差异很大，硬编码选择器总有覆盖不到的。
 */
function findScheduleTable() {
  for (const selector of TABLE_HINTS) {
    const node = document.querySelector(selector);
    if (node) {
      return node.tagName === 'TABLE' ? node : node.querySelector('table') || node;
    }
  }

  const tables = Array.from(document.querySelectorAll('table'));
  let best = null;
  let bestScore = 0;

  for (const table of tables) {
    const text = table.innerText || '';
    const score = HEADER_HINTS.filter((hint) => text.includes(hint)).length;
    // 顺便给格子多的表更高优先——课表总比布局表复杂
    const weight = score * 1000 + table.querySelectorAll('td').length;
    if (score > 0 && weight > bestScore) {
      best = table;
      bestScore = weight;
    }
  }

  return best;
}

function collect() {
  const table = findScheduleTable();

  if (!table) {
    return {
      ok: false,
      reason: 'no-table',
      title: document.title,
      url: location.href,
    };
  }

  return {
    ok: true,
    html: table.outerHTML,
    title: document.title,
    url: location.href,
    rows: table.querySelectorAll('tr').length,
    cells: table.querySelectorAll('td').length,
  };
}

// 监听扩展发来的取数请求
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'CLARK_COLLECT_SCHEDULE') {
    try {
      sendResponse(collect());
    } catch (error) {
      sendResponse({
        ok: false,
        reason: 'exception',
        detail: String(error && error.message ? error.message : error),
      });
    }
  }
  return true;
});
