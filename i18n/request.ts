import { getRequestConfig } from 'next-intl/server';
import { getUserLocale } from '../lib/locale';

// console.log('[i18n/request.ts] loaded!');

export default getRequestConfig(async () => {
  const locale = await getUserLocale();
  // console.log('[i18n/request.ts] locale:', locale);
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };

  // 如果需要按模块导入，可以参考以下代码
  // const messages = {
  //   ...(await import(`../messages/${locale}/common.json`).then((m) => m.default)),
  //   ...(await import(`../messages/${locale}/payment.json`).then((m) => m.default)),
  //   ...(await import(`../messages/${locale}/withdrawal.json`).then((m) => m.default)),
  //   // 可以继续添加模块
  // };

  // return {
  //   locale,
  //   messages
  // };
});
