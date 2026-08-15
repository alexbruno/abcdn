import { Hono } from 'hono';
import { setRegionData, setRegionsList } from './modules/ibge';
import { getObject } from './modules/storage';

const app = new Hono();

app.get('/', (ctx) => {
  return ctx.text('Hello Hono!');
});

app.get('/ibge/regioes', async (ctx) => {
  const data = await getObject(ctx.env as Env, 'ibge/regioes.json');
  return ctx.json(data);
});

app.get('ibge/regioes/:code', async (ctx) => {
  const { code } = ctx.req.param();
  const data = await getObject(ctx.env as Env, `ibge/regioes/${code}.json`);
  return ctx.json(data);
});

export default {
  fetch: app.fetch,
  async scheduled(ctrl: ScheduledController, env: Env, ctx: ExecutionContext) {
    console.log('scheduled', ctrl, env, ctx);

    try {
      const regionsList = await setRegionsList(env);
      const regionsRequests = regionsList.data.map(
        (reg: any, i: number) =>
          new Promise((resolve) =>
            setTimeout(async () => {
              await setRegionData(env, reg.sigla);
              resolve(void 0);
            }, i * 200),
          ),
      );

      await Promise.all(regionsRequests);
    } catch (error) {
      console.log('error', error);
    }
  },
};
