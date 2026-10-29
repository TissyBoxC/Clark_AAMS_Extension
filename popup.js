import { SCHOOLS, SERVICE_ORIGIN, matchSchool } from './schools.js';

/*
 * 一键导入：抓当前教务系统页面的课表 → 交给珂拉课程表解析。
 *
 * 解析在后端做（各校的模板差异都在那边维护），扩展只负责
 * 把课表那块 HTML 原样取出来，所以这里没有任何"课表长什么样"的知识。
 */

const stage = document.getElementById('stage');
const openSite = document.getElementById('open-site');

function render(html) {
  stage.innerHTML = html;
}

function renderIdle(title, detail, actionLabel, onAction) {
  render(`
    <p class="state-title">${title}</p>
    <p class="state-detail">${detail}</p>
  `);
  if (actionLabel) {
    const button = document.createElement('button');
    button.className = 'primary';
    button.textContent = actionLabel;
    button.addEventListener('click', onAction);
    stage.appendChild(button);
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[ch]);
}

/** 从当前标签页的内容脚本事里要课表 HTML。 */
async function collectFromTab(tabId) {
  return chrome.tabs.sendMessage(tabId, { type: 'CLARK_COLLECT_SCHEDULE' });
}

/** 调后端解析接口。 */
async function sendToService(school, collected) {
  /*
   * 课表可能在外层页面，也可能在 iframe 里（正方常见）。
   * 两个都传过去，由后端按学校解析器自己决定用哪一份。
   */
  const frames = Array.isArray(collected.frames) ? collected.frames : [];

  const response = await fetch(`${SERVICE_ORIGIN}/api/v1/imports/courses/html`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      school: school.id,
      schoolName: school.name,
      html: collected.html,
      frames: frames.map((frame) => ({ src: frame.src, id: frame.id, html: frame.html })),
    }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.message || '这次没能整理出来，请稍后再试。';
    const error = new Error(message);
    error.status = response.status;
    error.code = payload?.code;
    throw error;
  }

  return payload;
}

function describeCourses(data) {
  const courses = data?.courses ?? [];
  const count = courses.length;
  const warnings = data?.warnings ?? [];

  if (count === 0) {
    return {
      title: '这一页没有读到课程',
      detail: '先在上面打开「课表」或「我的课表」页面，等表格显示出来，再点一次导入。',
    };
  }

  const names = courses.slice(0, 3).map((c) => escapeHtml(c.name || '未命名的课')).join('、');
  const more = count > 3 ? ` 等 ${count} 门` : '';

  return {
    title: `读到 ${count} 门课`,
    detail: warnings.length
      ? `${names}${more}。有 ${warnings.length} 处需要你确认一下。`
      : `${names}${more}，已经放进你的课表。`,
  };
}

async function main() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.url) {
    renderIdle('现在这一页用不了', '打开学校教务系统的课表页，再点这里的按钮。');
    return;
  }

  const school = matchSchool(tab.url);

  if (!school) {
    const known = SCHOOLS.map((s) => s.name).join('、');
    renderIdle(
      '这一页还不支持',
      `目前支持 ${known}。在学校的教务系统里打开课表页，就能一键导入。`,
    );
    return;
  }

  renderIdle(
    `准备好了`,
    `会读取你打开的「${school.name}」课表页，整理后放进你的课表。`,
    '导入现在这一页',
    async () => {
      render(`<p class="state-text">正在读取这一页…</p>`);

      let collected;
      try {
        collected = await collectFromTab(tab.id);
      } catch {
        renderIdle(
          '没能读到这一页',
          '这一页可能还没加载完，或者刚刚跳转过。等页面稳定下来再点一次。',
          '再试一次',
          () => main(),
        );
        return;
      }

      if (!collected?.ok) {
        renderIdle(
          '没能读到这一页',
          '这一页没有可读取的内容。等页面显示完整后再点一次。',
          '再试一次',
          () => main(),
        );
        return;
      }

      render(`<p class="state-text">正在整理课表…</p>`);

      try {
        const payload = await sendToService(school, collected);
        const { title, detail } = describeCourses(payload?.data);
        const isSuccess = (payload?.data?.courses ?? []).length > 0;

        render(`
          <p class="state-title ${isSuccess ? 'is-success' : ''}">${title}</p>
          <p class="state-detail">${detail}</p>
        `);

        if (isSuccess) {
          const button = document.createElement('button');
          button.className = 'primary';
          button.textContent = '去课表看看';
          button.addEventListener('click', () => {
            chrome.tabs.create({ url: `${SERVICE_ORIGIN}/user/schedule` });
          });
          stage.appendChild(button);
        }
      } catch (error) {
        if (error.status === 401) {
          renderIdle(
            '先在珂拉课程表里登录',
            '整理课表需要知道放到谁的账号里。登录好后回来再点一次。',
            '去登录',
            () => chrome.tabs.create({ url: `${SERVICE_ORIGIN}/login` }),
          );
          return;
        }
        renderIdle(
          '这次没能整理出来',
          escapeHtml(error.message || '请稍后再试一次。'),
          '再试一次',
          () => main(),
        );
      }
    },
  );
}

openSite.addEventListener('click', (event) => {
  event.preventDefault();
  chrome.tabs.create({ url: openSite.href });
});

main();
