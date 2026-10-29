/*
 * 内容脚本：把当前页面的 HTML 原样交给扩展。
 *
 * 这里刻意不做任何「哪一块是课表」的判断。
 *
 * 早先的版本会去找 #Table1、.Nsb_r_list 之类的容器，找不到就报
 * 「这一页没找到课表」——用户明明已经打开了课表页，却被告知没有课表。
 * 错在方向：各校模板的差异是后端的责任，解析器本来就在那边，
 * 扩展再猜一遍只会多一层会出错的假设。
 *
 * 现在只负责一件事：把用户眼前这一页的 HTML 完整取出来。
 */

function collect() {
  const root = document.documentElement;

  if (!root) {
    return { ok: false, reason: 'no-document' };
  }

  const html = root.outerHTML;

  return {
    ok: true,
    html,
    title: document.title,
    url: location.href,
    bytes: html.length,
  };
}

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
