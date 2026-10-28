/*
 * 在珂拉课程表的页面里留下一个标记，让导入页知道「扩展已经装好了」。
 *
 * 为什么需要这个：用户装完扩展回到导入页，如果页面还在一遍遍教他
 * 「下载、加载扩展」，他会以为自己没装成功。页面得能问出来。
 *
 * 做法是往 DOM 上加一个自定义元素。页面查得到就说明扩展在。
 * 不用 window 变量，是因为内容脚本和页面脚本的全局作用域是隔离的。
 */

const MARKER_TAG = 'clark-aams-extension';

if (!document.querySelector(MARKER_TAG)) {
  const marker = document.createElement(MARKER_TAG);
  marker.setAttribute('data-version', chrome.runtime.getManifest().version);
  marker.hidden = true;
  document.documentElement.appendChild(marker);
}

// 页面需要广播「我要导入」时，可以调这里
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (message?.type === 'CLARK_PING') {
    sendResponse({ ok: true, version: chrome.runtime.getManifest().version });
  }
  return true;
});
