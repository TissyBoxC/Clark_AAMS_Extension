/*
 * 支持的学校。
 *
 * host 用来判断「用户此刻在哪个教务系统里」，据此决定传哪个学校给后端。
 * 后端 `/api/v1/schools/{id}` 里的 loginUrl 是同一份事实，这里是它在
 * 扩展里的副本——扩展不能在用户打开教务系统时再去问后端，
 * 那会让按钮在点击后才变灰，体验很差。
 */

export const SCHOOLS = [
  {
    id: 'jit',
    name: '金陵科技学院',
    host: 'jwxt.jit.edu.cn',
  },
  {
    id: 'jlu',
    name: '吉林大学',
    host: 'iedu.jlu.edu.cn',
  },
];

export const SERVICE_ORIGIN = 'https://card.clarkhub.cn';

/** 按当前页面地址找出对应的学校，找不到返回 null。 */
export function matchSchool(url) {
  let hostname = '';
  try {
    hostname = new URL(url).hostname;
  } catch {
    return null;
  }
  return SCHOOLS.find((school) => hostname === school.host || hostname.endsWith('.' + school.host)) ?? null;
}
