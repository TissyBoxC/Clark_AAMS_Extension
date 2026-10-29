/*
 * 内容脚本：把当前页面交出去，供后端解析。
 *
 * 扩展不判断哪块是课表——那是各校解析器的职责。
 *
 * 但它必须解决一个传送问题：正方等教务系统的课表常常**放在 iframe 里**。
 * 外层页面（mainbody > bodydiv > rightdiv > iframe#iframeautoheight）
 * 自己一个 <table> 都没有，课表全在 iframe 的 content_xs.aspx 里。
 * 只传外层 outerHTML，后端拿到的是空壳，只能报「解析失败」。
 *
 * 两个文档同源，脚本可以直接读 contentDocument，所以这里把 iframe
 * 的内部 HTML 一并带上。跨域 iframe 读不到，会跳过并不影响外层。
 */

/** 取出 iframe 内部文档的 HTML；跨域或尚未就绪时返回 null。 */
function readFrame(frame) {
  let doc;
  try {
    doc = frame.contentDocument || (frame.contentWindow && frame.contentWindow.document);
  } catch {
    return null; // 跨域被拦
  }
  if (!doc || !doc.documentElement) {
    return null;
  }
  // 同源但还没加载出内容时，body 可能是空的
  if (!doc.body || doc.body.children.length === 0) {
    return null;
  }
  return {
    src: frame.getAttribute('src') || '',
    id: frame.id || '',
    html: doc.documentElement.outerHTML,
  };
}

function collectFrames(root) {
  const frames = Array.from(root.querySelectorAll('iframe, frame'));
  const out = [];
  for (const frame of frames) {
    const read = readFrame(frame);
    if (read) {
      out.push(read);
    }
  }
  return out;
}

function collect() {
  const root = document.documentElement;
  if (!root) {
    return { ok: false, reason: 'no-document' };
  }

  const html = root.outerHTML;
  const frames = collectFrames(document);

  return {
    ok: true,
    html,
    frames,
    title: document.title,
    url: location.href,
    bytes: html.length,
    frameCount: frames.length,
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
